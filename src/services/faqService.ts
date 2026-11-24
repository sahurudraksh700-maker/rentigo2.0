import type { FaqEntry, Listing, PlatformSettings, RentalRequest, UserProfile } from '../types/rentigo';
import { dbStore, emitStoreChange } from './storage';

export interface ChatbotResponse {
  reply: string;
  matchedListings?: Listing[];
  requestSummaries?: Array<{
    id: string;
    listingTitle: string;
    status: RentalRequest['status'];
    startDate: string;
    endDate: string;
  }>;
  actionLink?: { label: string; to: string };
  showSupportEscalation?: boolean;
}

export const faqService = {
  async listFaqs(): Promise<FaqEntry[]> {
    return dbStore.getFaqEntries();
  },

  async upsertFaq(input: {
    id?: string;
    question: string;
    answer: string;
    keywords: string[];
    category: string;
  }): Promise<FaqEntry> {
    const list = dbStore.getFaqEntries();
    const now = new Date().toISOString();
    if (input.id) {
      const updated: FaqEntry = {
        id: input.id,
        question: input.question.trim(),
        answer: input.answer.trim(),
        keywords: input.keywords.map((k) => k.trim().toLowerCase()).filter(Boolean),
        category: input.category.trim() || 'General',
        updatedAt: now,
      };
      dbStore.saveFaqEntries(list.map((f) => (f.id === input.id ? updated : f)));
      emitStoreChange();
      return updated;
    }

    const created: FaqEntry = {
      id: `faq_${Date.now().toString(36)}`,
      question: input.question.trim(),
      answer: input.answer.trim(),
      keywords: input.keywords.map((k) => k.trim().toLowerCase()).filter(Boolean),
      category: input.category.trim() || 'General',
      updatedAt: now,
    };
    dbStore.saveFaqEntries([created, ...list]);
    emitStoreChange();
    return created;
  },

  async deleteFaq(id: string): Promise<void> {
    const list = dbStore.getFaqEntries();
    dbStore.saveFaqEntries(list.filter((f) => f.id !== id));
    emitStoreChange();
  },

  getPlatformSettingsSync(): PlatformSettings {
    return dbStore.getPlatformSettings();
  },

  async getPlatformSettings(): Promise<PlatformSettings> {
    return dbStore.getPlatformSettings();
  },

  async updatePlatformSettings(
    adminId: string,
    patch: Partial<PlatformSettings>,
  ): Promise<PlatformSettings> {
    const admin = dbStore.getUsers().find((u) => u.id === adminId);
    if (!admin || admin.role !== 'admin') {
      throw new Error('Only administrators can update platform settings.');
    }
    const next: PlatformSettings = {
      ...dbStore.getPlatformSettings(),
      ...patch,
    };
    dbStore.savePlatformSettings(next);
    emitStoreChange();
    return next;
  },

  /**
   * Modular rule + keyword FAQ responder.
   * Designed so it can be swapped cleanly for an LLM / Gemini endpoint later.
   */
  async chatbotAnswer(rawQuery: string, user: UserProfile | null): Promise<ChatbotResponse> {
    const q = rawQuery.trim().toLowerCase();
    if (!q) {
      return {
        reply: 'Ask me about renting, deposits, verification, referrals, or tap a quick action below.',
      };
    }

    // 1. Dynamic listing finder ("Find a camera", "looking for projector", etc.)
    if (
      q.includes('find ') ||
      q.includes('camera') ||
      q.includes('projector') ||
      q.includes('cycle') ||
      q.includes('blazer') ||
      q.includes('book')
    ) {
      const listings = dbStore
        .getListings()
        .filter((l) => !l.isPaused && !l.isHiddenByModeration);
      const terms = q
        .replace(/find|me|a|an|the|looking|for|rent|need/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length >= 3);

      const matches = listings
        .filter((l) => {
          const hay = `${l.title} ${l.category} ${l.description} ${l.college}`.toLowerCase();
          return terms.length === 0 ? true : terms.some((t) => hay.includes(t));
        })
        .slice(0, 3);

      if (matches.length > 0) {
        return {
          reply: `Here ${matches.length === 1 ? 'is 1 item' : `are ${matches.length} items`} available on campus right now:`,
          matchedListings: matches,
          actionLink: { label: 'Open full catalog', to: '/browse' },
        };
      }
      return {
        reply:
          'No active listings matched that right now. You can post a request on the Wanted board so classmates with that item can offer it.',
        actionLink: { label: 'Post on Wanted Board', to: '/wanted' },
      };
    }

    // 2. Dynamic request tracker ("Track my request", "booking status", "my rentals")
    if (
      q.includes('track') ||
      q.includes('my request') ||
      q.includes('my booking') ||
      q.includes('status')
    ) {
      if (!user) {
        return {
          reply:
            'Sign in with your campus account to view live status for your rental requests and lender pickups.',
          actionLink: { label: 'Open Dashboard', to: '/dashboard' },
        };
      }
      const listingsById = new Map(dbStore.getListings().map((l) => [l.id, l]));
      const myReqs = dbStore
        .getRequests()
        .filter((r) => r.renterId === user.id || r.ownerId === user.id)
        .slice(0, 3)
        .map((r) => ({
          id: r.id,
          listingTitle: listingsById.get(r.listingId)?.title ?? 'Campus Rental',
          status: r.status,
          startDate: r.startDate,
          endDate: r.endDate,
        }));

      if (myReqs.length === 0) {
        return {
          reply: 'You do not have any rental requests yet. Browse campus listings to send your first request.',
          actionLink: { label: 'Browse Rentals', to: '/browse' },
        };
      }

      return {
        reply: `Here are your ${myReqs.length} most recent bookings:`,
        requestSummaries: myReqs,
        actionLink: { label: 'Go to Dashboard', to: '/dashboard' },
      };
    }

    // 3. Report / problem / dispute intent
    if (
      q.includes('report') ||
      q.includes('problem') ||
      q.includes('issue') ||
      q.includes('damaged') ||
      q.includes('dispute') ||
      q.includes('scam') ||
      q.includes('human') ||
      q.includes('support')
    ) {
      return {
        reply:
          'For safety issues, damaged handovers, or urgent disputes, you can open a support ticket right here and our campus moderation team will review it in /admin.',
        showSupportEscalation: true,
        actionLink: { label: 'View Safety Guidelines', to: '/safety' },
      };
    }

    // 4. Score against dynamic admin-editable FAQs
    const faqs = dbStore.getFaqEntries();
    const tokens = q.split(/\W+/).filter((t) => t.length >= 2);
    let bestFaq: FaqEntry | null = null;
    let bestScore = 0;

    for (const faq of faqs) {
      let score = 0;
      const qLower = faq.question.toLowerCase();
      const aLower = faq.answer.toLowerCase();
      for (const kw of faq.keywords) {
        if (q.includes(kw.toLowerCase())) score += 4;
      }
      for (const tok of tokens) {
        if (qLower.includes(tok)) score += 2;
        if (aLower.includes(tok)) score += 1;
      }
      if (score > bestScore) {
        bestScore = score;
        bestFaq = faq;
      }
    }

    if (bestFaq && bestScore >= 3) {
      return {
        reply: bestFaq.answer,
        actionLink:
          bestFaq.category === 'Referrals'
            ? { label: 'Open Referrals', to: '/referrals' }
            : bestFaq.category === 'Safety'
              ? { label: 'Campus Safety', to: '/safety' }
              : undefined,
      };
    }

    // 5. Fallback -> offer Talk to support
    return {
      reply:
        "I couldn't find an exact answer in the campus FAQ. Would you like to create a support ticket for our team?",
      showSupportEscalation: true,
    };
  },
};
