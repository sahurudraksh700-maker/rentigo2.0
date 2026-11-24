import type { ChatMessage, Conversation } from '../types/rentigo';
import { moderationService } from './moderationService';
import { notificationsService } from './notificationsService';
import { dbStore, emitStoreChange } from './storage';

const RATE_LIMIT_MAX = 8;
const RATE_LIMIT_WINDOW_MS = 30_000;
const recentSendTimestamps = new Map<string, number[]>();

const PHONE_REGEX = /(?:\+?\d[\s-]?){8,13}\d/g;
const LINK_REGEX = /(https?:\/\/\S+|www\.\S+|[a-z0-9-]+\.(?:com|in|net|org|app|me|io)\b\S*)/gi;

export const QUICK_REPLY_CHIPS = [
  'Is it available?',
  'Can we meet at the library?',
  'Can you do a lower price?',
] as const;

export const chatService = {
  hasAcceptedBookingBetweenSync(listingId: string, userA: string, userB: string): boolean {
    const requests = dbStore.getRequests();
    return requests.some(
      (r) =>
        r.listingId === listingId &&
        (r.status === 'Accepted' || r.status === 'Returned') &&
        ((r.renterId === userA && r.ownerId === userB) ||
          (r.renterId === userB && r.ownerId === userA)),
    );
  },

  async getOrCreateConversation(input: {
    listingId: string;
    renterId: string;
    ownerId: string;
  }): Promise<Conversation> {
    if (input.renterId === input.ownerId) {
      throw new Error('You cannot message yourself about your own listing.');
    }
    if (moderationService.isBlockedPairSync(input.renterId, input.ownerId)) {
      throw new Error('Messaging is unavailable because one user blocked the other.');
    }

    const existing = dbStore.getConversations();
    const match = existing.find(
      (c) =>
        c.listingId === input.listingId &&
        c.renterId === input.renterId &&
        c.ownerId === input.ownerId,
    );
    if (match) return match;

    const created: Conversation = {
      id: `conv_${input.listingId}__${input.renterId}__${input.ownerId}`,
      listingId: input.listingId,
      renterId: input.renterId,
      ownerId: input.ownerId,
      participantIds: [input.renterId, input.ownerId],
      lastMessageText: '',
      lastMessageAt: new Date().toISOString(),
      lastSenderId: input.renterId,
      unreadCountByUser: {
        [input.renterId]: 0,
        [input.ownerId]: 0,
      },
      typingByUser: {},
    };

    dbStore.saveConversations([created, ...existing]);
    emitStoreChange();
    return created;
  },

  async listForUser(userId: string): Promise<Conversation[]> {
    return dbStore
      .getConversations()
      .filter((c) => c.participantIds.includes(userId))
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  },

  async listMessages(conversationId: string): Promise<ChatMessage[]> {
    return dbStore
      .getMessages()
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  getTotalUnreadCountSync(userId: string): number {
    return dbStore
      .getConversations()
      .filter((c) => c.participantIds.includes(userId))
      .reduce((sum, c) => sum + (c.unreadCountByUser?.[userId] ?? 0), 0);
  },

  async sendMessage(input: {
    conversationId: string;
    senderId: string;
    text: string;
    imageUrl?: string;
  }): Promise<{ message: ChatMessage; warning?: string }> {
    const convs = dbStore.getConversations();
    const conv = convs.find((c) => c.id === input.conversationId);
    if (!conv) throw new Error('Conversation not found.');
    if (!conv.participantIds.includes(input.senderId)) {
      throw new Error('You are not part of this conversation.');
    }

    const otherId = conv.participantIds.find((id) => id !== input.senderId)!;
    if (moderationService.isBlockedPairSync(input.senderId, otherId)) {
      throw new Error('Cannot send message: one participant has blocked the other.');
    }

    // Rate limit
    const nowMs = Date.now();
    const recent = (recentSendTimestamps.get(input.senderId) ?? []).filter(
      (ts) => nowMs - ts < RATE_LIMIT_WINDOW_MS,
    );
    if (recent.length >= RATE_LIMIT_MAX) {
      throw new Error('Slow down — rate limit reached (max 8 messages per 30 seconds).');
    }
    recentSendTimestamps.set(input.senderId, [...recent, nowMs]);

    let cleanText = input.text.trim();
    if (!cleanText && !input.imageUrl) {
      throw new Error('Type a message or attach an image.');
    }

    // Phone & external link guard before Accepted booking
    let warning: string | undefined;
    const bookingAccepted = this.hasAcceptedBookingBetweenSync(
      conv.listingId,
      conv.renterId,
      conv.ownerId,
    );

    if (!bookingAccepted && cleanText) {
      const hasPhone = PHONE_REGEX.test(cleanText);
      PHONE_REGEX.lastIndex = 0;
      const hasLink = LINK_REGEX.test(cleanText);
      LINK_REGEX.lastIndex = 0;

      if (hasPhone) {
        cleanText = cleanText.replace(PHONE_REGEX, '[phone hidden until accepted]');
        warning =
          'Phone numbers are hidden in chat until a booking is Accepted to keep campus trades safe.';
      } else if (hasLink) {
        warning =
          'Safety reminder: Keep chat and payments inside Rentigo — avoid external links before a booking is Accepted.';
      }
    }

    const nowIso = new Date().toISOString();
    const msg: ChatMessage = {
      id: `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      conversationId: conv.id,
      senderId: input.senderId,
      text: cleanText,
      imageUrl: input.imageUrl,
      createdAt: nowIso,
    };

    const messages = dbStore.getMessages();
    dbStore.saveMessages([...messages, msg]);

    const nextTyping = { ...(conv.typingByUser || {}) };
    delete nextTyping[input.senderId];

    const preview = cleanText || 'Sent a photo';
    const updatedConv: Conversation = {
      ...conv,
      lastMessageText: preview,
      lastMessageAt: nowIso,
      lastSenderId: input.senderId,
      unreadCountByUser: {
        ...conv.unreadCountByUser,
        [otherId]: (conv.unreadCountByUser?.[otherId] ?? 0) + 1,
      },
      typingByUser: nextTyping,
    };

    dbStore.saveConversations(convs.map((c) => (c.id === conv.id ? updatedConv : c)));

    const sender = dbStore.getUsers().find((u) => u.id === input.senderId);
    await notificationsService.createNotification({
      userId: otherId,
      type: 'message_new',
      title: `New message from ${sender?.firstName ?? 'Classmate'}`,
      body: preview.slice(0, 90),
      link: `/messages?conv=${encodeURIComponent(conv.id)}`,
      meta: { conversationId: conv.id },
    });

    emitStoreChange();
    return { message: msg, warning };
  },

  async setTyping(conversationId: string, userId: string, isTyping: boolean): Promise<void> {
    const convs = dbStore.getConversations();
    const target = convs.find((c) => c.id === conversationId);
    if (!target || !target.participantIds.includes(userId)) return;

    const nextTyping = { ...(target.typingByUser || {}) };
    if (isTyping) {
      nextTyping[userId] = new Date().toISOString();
    } else {
      delete nextTyping[userId];
    }

    dbStore.saveConversations(
      convs.map((c) => (c.id === conversationId ? { ...c, typingByUser: nextTyping } : c)),
    );
    emitStoreChange();
  },

  async markConversationRead(conversationId: string, userId: string): Promise<void> {
    const convs = dbStore.getConversations();
    const target = convs.find((c) => c.id === conversationId);
    if (!target || !target.participantIds.includes(userId)) return;

    const now = new Date().toISOString();
    const messages = dbStore.getMessages();
    let msgChanged = false;
    const nextMessages = messages.map((m) => {
      if (m.conversationId === conversationId && m.senderId !== userId && !m.readAt) {
        msgChanged = true;
        return { ...m, readAt: now };
      }
      return m;
    });

    const hadUnread = (target.unreadCountByUser?.[userId] ?? 0) > 0;
    if (msgChanged) {
      dbStore.saveMessages(nextMessages);
    }
    if (hadUnread) {
      dbStore.saveConversations(
        convs.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                unreadCountByUser: { ...c.unreadCountByUser, [userId]: 0 },
              }
            : c,
        ),
      );
    }
    if (msgChanged || hadUnread) {
      emitStoreChange();
    }
  },
};
