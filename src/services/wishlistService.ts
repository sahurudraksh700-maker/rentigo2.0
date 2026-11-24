import type { WishlistItem } from '../types/rentigo';
import { expandDateRange, todayIsoDate } from '../utils/dates';
import { notificationsService } from './notificationsService';
import { dbStore, emitStoreChange } from './storage';

function isListingRentedToday(listingId: string): boolean {
  const today = todayIsoDate();
  const requests = dbStore.getRequests();
  for (const req of requests) {
    if (req.listingId === listingId && req.status === 'Accepted') {
      if (expandDateRange(req.startDate, req.endDate).includes(today)) {
        return true;
      }
    }
  }
  return false;
}

export const wishlistService = {
  async listByUser(userId: string): Promise<WishlistItem[]> {
    return dbStore
      .getWishlists()
      .filter((w) => w.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  isWishlistedSync(userId: string | null | undefined, listingId: string): boolean {
    if (!userId) return false;
    return dbStore
      .getWishlists()
      .some((w) => w.userId === userId && w.listingId === listingId);
  },

  async toggle(userId: string, listingId: string): Promise<{ saved: boolean }> {
    const items = dbStore.getWishlists();
    const existing = items.find((w) => w.userId === userId && w.listingId === listingId);
    if (existing) {
      dbStore.saveWishlists(items.filter((w) => w.id !== existing.id));
      emitStoreChange();
      return { saved: false };
    }

    const listing = dbStore.getListings().find((l) => l.id === listingId);
    const unavailable = !listing || listing.isPaused || isListingRentedToday(listingId);

    const created: WishlistItem = {
      id: `wsh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      userId,
      listingId,
      wasUnavailableWhenSaved: unavailable,
      createdAt: new Date().toISOString(),
    };
    dbStore.saveWishlists([created, ...items]);
    emitStoreChange();
    return { saved: true };
  },

  async remove(userId: string, listingId: string): Promise<void> {
    const items = dbStore.getWishlists();
    dbStore.saveWishlists(
      items.filter((w) => !(w.userId === userId && w.listingId === listingId)),
    );
    emitStoreChange();
  },

  markWatchersUnavailable(listingId: string): void {
    const items = dbStore.getWishlists();
    let changed = false;
    const next = items.map((w) => {
      if (w.listingId === listingId && !w.wasUnavailableWhenSaved) {
        changed = true;
        return { ...w, wasUnavailableWhenSaved: true };
      }
      return w;
    });
    if (changed) {
      dbStore.saveWishlists(next);
      emitStoreChange();
    }
  },

  async notifySavedUsersIfAvailable(listingId: string): Promise<void> {
    const listing = dbStore.getListings().find((l) => l.id === listingId);
    if (!listing || listing.isPaused || listing.isHiddenByModeration) return;
    if (isListingRentedToday(listingId)) return;

    const items = dbStore.getWishlists();
    const watchers = items.filter(
      (w) => w.listingId === listingId && w.wasUnavailableWhenSaved && w.userId !== listing.ownerId,
    );
    if (watchers.length === 0) return;

    for (const watcher of watchers) {
      await notificationsService.createNotification({
        userId: watcher.userId,
        type: 'wishlist_available',
        title: 'Saved item is available again',
        body: `"${listing.title}" is now available to book on campus.`,
        link: `/listing/${listing.id}`,
        meta: { listingId: listing.id },
      });
    }

    dbStore.saveWishlists(
      items.map((w) =>
        w.listingId === listingId && w.wasUnavailableWhenSaved
          ? { ...w, wasUnavailableWhenSaved: false }
          : w,
      ),
    );
    emitStoreChange();
  },
};
