import type { AppNotification, NotificationType } from '../types/rentigo';
import { addDaysIsoDate, todayIsoDate } from '../utils/dates';
import { dbStore, emitStoreChange } from './storage';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  meta?: Record<string, string>;
}

export const notificationsService = {
  async listForUser(userId: string): Promise<AppNotification[]> {
    return dbStore
      .getNotifications()
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  getUnreadCountSync(userId: string): number {
    return dbStore
      .getNotifications()
      .filter((n) => n.userId === userId && !n.isRead).length;
  },

  async createNotification(input: CreateNotificationInput): Promise<AppNotification | null> {
    const users = dbStore.getUsers();
    const recipient = users.find((u) => u.id === input.userId);
    if (recipient?.notificationSettings && recipient.notificationSettings[input.type] === false) {
      return null;
    }

    const item: AppNotification = {
      id: `ntf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
      isRead: false,
      meta: input.meta,
      createdAt: new Date().toISOString(),
    };

    const existing = dbStore.getNotifications();
    dbStore.saveNotifications([item, ...existing]);
    emitStoreChange();
    return item;
  },

  async markRead(notificationId: string, userId: string): Promise<void> {
    const items = dbStore.getNotifications();
    const target = items.find((n) => n.id === notificationId);
    if (!target || target.userId !== userId) return;
    if (target.isRead) return;

    dbStore.saveNotifications(
      items.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
    );
    emitStoreChange();
  },

  async markAllRead(userId: string): Promise<void> {
    const items = dbStore.getNotifications();
    let changed = false;
    const next = items.map((n) => {
      if (n.userId === userId && !n.isRead) {
        changed = true;
        return { ...n, isRead: true };
      }
      return n;
    });
    if (changed) {
      dbStore.saveNotifications(next);
      emitStoreChange();
    }
  },

  /**
   * Fires a single deduplicated `return_reminder` notification when an Accepted
   * booking's return date is tomorrow (1 day before end date) or due today.
   */
  async checkReturnRemindersForUser(userId: string): Promise<void> {
    const today = todayIsoDate();
    const tomorrow = addDaysIsoDate(today, 1);
    const requests = dbStore.getRequests();
    const listingsById = new Map(dbStore.getListings().map((l) => [l.id, l]));
    const existingNotifs = dbStore.getNotifications();

    for (const req of requests) {
      if (req.status !== 'Accepted') continue;
      if (req.renterId !== userId && req.ownerId !== userId) continue;
      if (req.endDate !== tomorrow && req.endDate !== today) continue;

      const reminderKey = `${req.id}__${req.endDate}__${userId}`;
      const alreadySent = existingNotifs.some(
        (n) => n.type === 'return_reminder' && n.meta?.reminderKey === reminderKey,
      );
      if (alreadySent) continue;

      const listingTitle = listingsById.get(req.listingId)?.title ?? 'your campus rental';
      const isRenter = req.renterId === userId;
      const duePhrase = req.endDate === today ? 'is due back today' : 'is due back tomorrow';

      await this.createNotification({
        userId,
        type: 'return_reminder',
        title: isRenter ? 'Return reminder' : 'Upcoming item return',
        body: isRenter
          ? `"${listingTitle}" ${duePhrase} (${req.endDate}). Coordinate campus return & checklist.`
          : `"${listingTitle}" ${duePhrase} (${req.endDate}) from your classmate.`,
        link: '/dashboard',
        meta: { reminderKey, requestId: req.id },
      });
    }
  },
};
