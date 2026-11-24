import {
  DEFAULT_PLATFORM_SETTINGS,
  SEED_CONVERSATIONS,
  SEED_FAQS,
  SEED_LISTINGS,
  SEED_MESSAGES,
  SEED_REQUESTS,
  SEED_REVIEWS,
  SEED_USERS,
  SEED_WANTED,
} from '../data/seedData';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  isAdminEmail,
  type AppNotification,
  type ChatMessage,
  type Conversation,
  type CreditTransaction,
  type FaqEntry,
  type Listing,
  type ModerationReport,
  type PaymentRecord,
  type PlatformSettings,
  type ReferralRecord,
  type RentalRequest,
  type Review,
  type SavedSearch,
  type SupportTicket,
  type UserBlock,
  type UserProfile,
  type VerificationRequest,
  type WantedPost,
  type WishlistItem,
} from '../types/rentigo';

function normalizeUser(raw: Partial<UserProfile>): UserProfile {
  const safeName = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Campus Student';
  const safeFirst =
    typeof raw.firstName === 'string' && raw.firstName.trim()
      ? raw.firstName.trim()
      : safeName.split(/\s+/)[0] || 'Student';
  const adminUser = isAdminEmail(raw.email);
  return {
    id: raw.id || `usr_${Math.random().toString(36).slice(2, 8)}`,
    name: safeName,
    firstName: safeFirst,
    email: raw.email || '',
    college: raw.college || 'Campus',
    phone: raw.phone || '',
    photoUrl: raw.photoUrl || '',
    role: adminUser || raw.role === 'admin' ? 'admin' : 'student',
    rating: typeof raw.rating === 'number' ? raw.rating : 5.0,
    reviewCount: typeof raw.reviewCount === 'number' ? raw.reviewCount : 0,
    completedRentalsCount: typeof raw.completedRentalsCount === 'number' ? raw.completedRentalsCount : 0,
    avgResponseMinutes: typeof raw.avgResponseMinutes === 'number' ? raw.avgResponseMinutes : 20,
    isVerified: adminUser || Boolean(raw.isVerified),
    verificationStatus: adminUser
      ? 'verified'
      : raw.verificationStatus || (raw.isVerified ? 'verified' : 'unverified'),
    verifiedCollegeEmail: raw.verifiedCollegeEmail,
    isBanned: Boolean(raw.isBanned),
    referralCode: raw.referralCode || `${safeFirst.toUpperCase().slice(0, 5)}50`,
    referredByUserId: raw.referredByUserId,
    referredByCode: raw.referredByCode,
    creditBalance: typeof raw.creditBalance === 'number' ? raw.creditBalance : 0,
    language: raw.language === 'hi' ? 'hi' : 'en',
    privacySettings: {
      hideLastName: Boolean(raw.privacySettings?.hideLastName),
      hidePhoneUntilAccepted: raw.privacySettings?.hidePhoneUntilAccepted ?? true,
    },
    notificationSettings: {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      ...(raw.notificationSettings || {}),
    },
    joinedAt: raw.joinedAt || '2026-08-15T10:00:00.000Z',
  };
}

function normalizeListing(raw: Partial<Listing>): Listing {
  return {
    id: raw.id || `lst_${Math.random().toString(36).slice(2, 8)}`,
    ownerId: raw.ownerId || 'usr_aarav',
    title: raw.title || 'Campus Item',
    description: raw.description || '',
    category: raw.category || 'Other',
    photos: Array.isArray(raw.photos) ? raw.photos : [],
    pricePerDay: typeof raw.pricePerDay === 'number' ? raw.pricePerDay : 100,
    deposit: typeof raw.deposit === 'number' ? raw.deposit : 500,
    lateFeePerDay: typeof raw.lateFeePerDay === 'number' ? raw.lateFeePerDay : 50,
    cancellationPolicy: raw.cancellationPolicy || 'Flexible',
    condition: raw.condition || 'Good',
    pickupLocation: raw.pickupLocation || 'Main Gate',
    college: raw.college || 'Campus',
    availableFrom: raw.availableFrom || '2026-11-01',
    availableTo: raw.availableTo || '2027-06-30',
    isPaused: Boolean(raw.isPaused),
    viewCount: typeof raw.viewCount === 'number' ? raw.viewCount : 0,
    reportCount: typeof raw.reportCount === 'number' ? raw.reportCount : 0,
    isHiddenByModeration: Boolean(raw.isHiddenByModeration),
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}

function normalizeRequest(raw: Partial<RentalRequest>): RentalRequest {
  return {
    id: raw.id || `req_${Math.random().toString(36).slice(2, 8)}`,
    listingId: raw.listingId || '',
    renterId: raw.renterId || '',
    ownerId: raw.ownerId || '',
    startDate: raw.startDate || '2026-11-25',
    endDate: raw.endDate || '2026-11-25',
    days: typeof raw.days === 'number' ? raw.days : 1,
    pricePerDaySnapshot: typeof raw.pricePerDaySnapshot === 'number' ? raw.pricePerDaySnapshot : 0,
    depositSnapshot: typeof raw.depositSnapshot === 'number' ? raw.depositSnapshot : 0,
    lateFeePerDaySnapshot: typeof raw.lateFeePerDaySnapshot === 'number' ? raw.lateFeePerDaySnapshot : 0,
    cancellationPolicySnapshot: raw.cancellationPolicySnapshot || 'Flexible',
    creditsUsed: typeof raw.creditsUsed === 'number' ? raw.creditsUsed : 0,
    totalAmount: typeof raw.totalAmount === 'number' ? raw.totalAmount : 0,
    paymentId: raw.paymentId,
    message: raw.message || '',
    status: raw.status || 'Pending',
    depositStatus: raw.depositStatus || 'Held',
    depositDeductionAmount: raw.depositDeductionAmount,
    depositDeductionReason: raw.depositDeductionReason,
    lateDays: raw.lateDays,
    lateFeeCharged: raw.lateFeeCharged,
    pickupChecklist: raw.pickupChecklist,
    returnChecklist: raw.returnChecklist,
    disputeTicketId: raw.disputeTicketId,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

const KEYS = {
  seeded: 'rentigo_seeded_v2',
  users: 'rentigo_users_v2',
  listings: 'rentigo_listings_v2',
  requests: 'rentigo_requests_v2',
  wishlists: 'rentigo_wishlists_v2',
  conversations: 'rentigo_conversations_v2',
  messages: 'rentigo_messages_v2',
  reviews: 'rentigo_reviews_v2',
  notifications: 'rentigo_notifications_v2',
  referrals: 'rentigo_referrals_v2',
  creditTransactions: 'rentigo_credit_transactions_v2',
  payments: 'rentigo_payments_v2',
  verifications: 'rentigo_verifications_v2',
  reports: 'rentigo_reports_v2',
  blocks: 'rentigo_blocks_v2',
  supportTickets: 'rentigo_support_tickets_v2',
  savedSearches: 'rentigo_saved_searches_v2',
  wantedPosts: 'rentigo_wanted_posts_v2',
  recentlyViewed: 'rentigo_recently_viewed_v2',
  faqEntries: 'rentigo_faq_entries_v2',
  platformSettings: 'rentigo_platform_settings_v2',
  pendingRef: 'rentigo_pending_ref_v2',
  sessionUserId: 'rentigo_session_user_id_v2',
  theme: 'rentigo_theme_v2',
} as const;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota errors gracefully
  }
}

export function ensureSeeded(): void {
  try {
    if (localStorage.getItem(KEYS.seeded) === '1') {
      const existingUsers = readJson<Partial<UserProfile>[]>(KEYS.users, []);
      const hasOwnerAdmin = existingUsers.some(
        (u) => (u.email || '').trim().toLowerCase() === 'sahurudraksh700@gmail.com',
      );
      const ownerSeed = SEED_USERS.find((u) => u.email.toLowerCase() === 'sahurudraksh700@gmail.com');
      if (!hasOwnerAdmin && ownerSeed && existingUsers.length > 0) {
        writeJson(KEYS.users, [ownerSeed, ...existingUsers.map(normalizeUser)]);
      }
      return;
    }

    // Migrate previous session/theme if present
    const legacySession = localStorage.getItem('rk_session_user_id_v1');
    if (legacySession && !localStorage.getItem(KEYS.sessionUserId)) {
      localStorage.setItem(KEYS.sessionUserId, legacySession);
    }
    const legacyTheme = localStorage.getItem('rk_theme_v1');
    if (legacyTheme && !localStorage.getItem(KEYS.theme)) {
      localStorage.setItem(KEYS.theme, legacyTheme);
    }

    if (!localStorage.getItem(KEYS.users)) writeJson(KEYS.users, SEED_USERS);
    if (!localStorage.getItem(KEYS.listings)) writeJson(KEYS.listings, SEED_LISTINGS);
    if (!localStorage.getItem(KEYS.requests)) writeJson(KEYS.requests, SEED_REQUESTS);
    if (!localStorage.getItem(KEYS.wishlists)) writeJson(KEYS.wishlists, []);
    if (!localStorage.getItem(KEYS.conversations)) writeJson(KEYS.conversations, SEED_CONVERSATIONS);
    if (!localStorage.getItem(KEYS.messages)) writeJson(KEYS.messages, SEED_MESSAGES);
    if (!localStorage.getItem(KEYS.reviews)) writeJson(KEYS.reviews, SEED_REVIEWS);
    if (!localStorage.getItem(KEYS.notifications)) writeJson(KEYS.notifications, []);
    if (!localStorage.getItem(KEYS.referrals)) writeJson(KEYS.referrals, []);
    if (!localStorage.getItem(KEYS.creditTransactions)) writeJson(KEYS.creditTransactions, []);
    if (!localStorage.getItem(KEYS.payments)) writeJson(KEYS.payments, []);
    if (!localStorage.getItem(KEYS.verifications)) writeJson(KEYS.verifications, []);
    if (!localStorage.getItem(KEYS.reports)) writeJson(KEYS.reports, []);
    if (!localStorage.getItem(KEYS.blocks)) writeJson(KEYS.blocks, []);
    if (!localStorage.getItem(KEYS.supportTickets)) writeJson(KEYS.supportTickets, []);
    if (!localStorage.getItem(KEYS.savedSearches)) writeJson(KEYS.savedSearches, []);
    if (!localStorage.getItem(KEYS.wantedPosts)) writeJson(KEYS.wantedPosts, SEED_WANTED);
    if (!localStorage.getItem(KEYS.recentlyViewed)) writeJson(KEYS.recentlyViewed, {});
    if (!localStorage.getItem(KEYS.faqEntries)) writeJson(KEYS.faqEntries, SEED_FAQS);
    if (!localStorage.getItem(KEYS.platformSettings)) {
      writeJson(KEYS.platformSettings, DEFAULT_PLATFORM_SETTINGS);
    }

    localStorage.setItem(KEYS.seeded, '1');
  } catch {
    // ignore if localStorage disabled
  }
}

export const dbStore = {
  getUsers(): UserProfile[] {
    ensureSeeded();
    return readJson<Partial<UserProfile>[]>(KEYS.users, SEED_USERS).map(normalizeUser);
  },
  saveUsers(users: UserProfile[]): void {
    writeJson(KEYS.users, users);
  },
  getListings(): Listing[] {
    ensureSeeded();
    return readJson<Partial<Listing>[]>(KEYS.listings, SEED_LISTINGS).map(normalizeListing);
  },
  saveListings(listings: Listing[]): void {
    writeJson(KEYS.listings, listings);
  },
  getRequests(): RentalRequest[] {
    ensureSeeded();
    return readJson<Partial<RentalRequest>[]>(KEYS.requests, SEED_REQUESTS).map(normalizeRequest);
  },
  saveRequests(requests: RentalRequest[]): void {
    writeJson(KEYS.requests, requests);
  },
  getWishlists(): WishlistItem[] {
    ensureSeeded();
    return readJson<WishlistItem[]>(KEYS.wishlists, []);
  },
  saveWishlists(items: WishlistItem[]): void {
    writeJson(KEYS.wishlists, items);
  },
  getConversations(): Conversation[] {
    ensureSeeded();
    return readJson<Conversation[]>(KEYS.conversations, SEED_CONVERSATIONS);
  },
  saveConversations(conversations: Conversation[]): void {
    writeJson(KEYS.conversations, conversations);
  },
  getMessages(): ChatMessage[] {
    ensureSeeded();
    return readJson<ChatMessage[]>(KEYS.messages, SEED_MESSAGES);
  },
  saveMessages(messages: ChatMessage[]): void {
    writeJson(KEYS.messages, messages);
  },
  getReviews(): Review[] {
    ensureSeeded();
    return readJson<Review[]>(KEYS.reviews, SEED_REVIEWS);
  },
  saveReviews(reviews: Review[]): void {
    writeJson(KEYS.reviews, reviews);
  },
  getNotifications(): AppNotification[] {
    ensureSeeded();
    return readJson<AppNotification[]>(KEYS.notifications, []);
  },
  saveNotifications(items: AppNotification[]): void {
    writeJson(KEYS.notifications, items);
  },
  getReferrals(): ReferralRecord[] {
    ensureSeeded();
    return readJson<ReferralRecord[]>(KEYS.referrals, []);
  },
  saveReferrals(items: ReferralRecord[]): void {
    writeJson(KEYS.referrals, items);
  },
  getCreditTransactions(): CreditTransaction[] {
    ensureSeeded();
    return readJson<CreditTransaction[]>(KEYS.creditTransactions, []);
  },
  saveCreditTransactions(items: CreditTransaction[]): void {
    writeJson(KEYS.creditTransactions, items);
  },
  getPayments(): PaymentRecord[] {
    ensureSeeded();
    return readJson<PaymentRecord[]>(KEYS.payments, []);
  },
  savePayments(items: PaymentRecord[]): void {
    writeJson(KEYS.payments, items);
  },
  getVerifications(): VerificationRequest[] {
    ensureSeeded();
    return readJson<VerificationRequest[]>(KEYS.verifications, []);
  },
  saveVerifications(items: VerificationRequest[]): void {
    writeJson(KEYS.verifications, items);
  },
  getReports(): ModerationReport[] {
    ensureSeeded();
    return readJson<ModerationReport[]>(KEYS.reports, []);
  },
  saveReports(reports: ModerationReport[]): void {
    writeJson(KEYS.reports, reports);
  },
  getBlocks(): UserBlock[] {
    ensureSeeded();
    return readJson<UserBlock[]>(KEYS.blocks, []);
  },
  saveBlocks(blocks: UserBlock[]): void {
    writeJson(KEYS.blocks, blocks);
  },
  getSupportTickets(): SupportTicket[] {
    ensureSeeded();
    return readJson<SupportTicket[]>(KEYS.supportTickets, []);
  },
  saveSupportTickets(tickets: SupportTicket[]): void {
    writeJson(KEYS.supportTickets, tickets);
  },
  getSavedSearches(): SavedSearch[] {
    ensureSeeded();
    return readJson<SavedSearch[]>(KEYS.savedSearches, []);
  },
  saveSavedSearches(items: SavedSearch[]): void {
    writeJson(KEYS.savedSearches, items);
  },
  getWantedPosts(): WantedPost[] {
    ensureSeeded();
    return readJson<WantedPost[]>(KEYS.wantedPosts, SEED_WANTED);
  },
  saveWantedPosts(items: WantedPost[]): void {
    writeJson(KEYS.wantedPosts, items);
  },
  getRecentlyViewedMap(): Record<string, string[]> {
    ensureSeeded();
    return readJson<Record<string, string[]>>(KEYS.recentlyViewed, {});
  },
  saveRecentlyViewedMap(map: Record<string, string[]>): void {
    writeJson(KEYS.recentlyViewed, map);
  },
  getFaqEntries(): FaqEntry[] {
    ensureSeeded();
    return readJson<FaqEntry[]>(KEYS.faqEntries, SEED_FAQS);
  },
  saveFaqEntries(entries: FaqEntry[]): void {
    writeJson(KEYS.faqEntries, entries);
  },
  getPlatformSettings(): PlatformSettings {
    ensureSeeded();
    return readJson<PlatformSettings>(KEYS.platformSettings, DEFAULT_PLATFORM_SETTINGS);
  },
  savePlatformSettings(settings: PlatformSettings): void {
    writeJson(KEYS.platformSettings, settings);
  },
  getPendingReferralCode(): string | null {
    try {
      return localStorage.getItem(KEYS.pendingRef);
    } catch {
      return null;
    }
  },
  setPendingReferralCode(code: string | null): void {
    try {
      if (code) localStorage.setItem(KEYS.pendingRef, code.trim().toUpperCase());
      else localStorage.removeItem(KEYS.pendingRef);
    } catch {
      // ignore
    }
  },
  getSessionUserId(): string | null {
    try {
      return localStorage.getItem(KEYS.sessionUserId);
    } catch {
      return null;
    }
  },
  setSessionUserId(id: string | null): void {
    try {
      if (id) localStorage.setItem(KEYS.sessionUserId, id);
      else localStorage.removeItem(KEYS.sessionUserId);
    } catch {
      // ignore
    }
  },
  getTheme(): 'light' | 'dark' {
    try {
      const saved = localStorage.getItem(KEYS.theme);
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  },
  setTheme(theme: 'light' | 'dark'): void {
    try {
      localStorage.setItem(KEYS.theme, theme);
    } catch {
      // ignore
    }
  },
};

export function emitStoreChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('rentigo-store-updated'));
  }
}
