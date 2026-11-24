import type { Listing, ListingCategory, SavedSearch, WantedPost, WantedResponse } from '../types/rentigo';
import { notificationsService } from './notificationsService';
import { dbStore, emitStoreChange } from './storage';

export const discoveryService = {
  trackRecentlyViewed(userId: string | null | undefined, listingId: string): void {
    const key = userId || 'guest';
    const map = dbStore.getRecentlyViewedMap();
    const current = map[key] ?? [];
    const next = [listingId, ...current.filter((id) => id !== listingId)].slice(0, 8);
    dbStore.saveRecentlyViewedMap({ ...map, [key]: next });
  },

  async listRecentlyViewed(userId: string | null | undefined): Promise<Listing[]> {
    const key = userId || 'guest';
    const map = dbStore.getRecentlyViewedMap();
    const ids = map[key] ?? [];
    const listingsById = new Map(
      dbStore
        .getListings()
        .filter((l) => !l.isHiddenByModeration)
        .map((l) => [l.id, l]),
    );
    return ids.map((id) => listingsById.get(id)).filter((l): l is Listing => Boolean(l));
  },

  async listTrendingListings(campus?: string): Promise<Listing[]> {
    const listings = dbStore
      .getListings()
      .filter((l) => !l.isHiddenByModeration && !l.isPaused);
    const requests = dbStore.getRequests();
    const reqCounts = new Map<string, number>();
    for (const r of requests) {
      reqCounts.set(r.listingId, (reqCounts.get(r.listingId) ?? 0) + 1);
    }

    const filtered =
      campus && campus !== 'All Campuses'
        ? listings.filter((l) => l.college.toLowerCase().includes(campus.toLowerCase()))
        : listings;

    return [...filtered]
      .sort((a, b) => {
        const scoreA = (a.viewCount || 0) + (reqCounts.get(a.id) ?? 0) * 15;
        const scoreB = (b.viewCount || 0) + (reqCounts.get(b.id) ?? 0) * 15;
        return scoreB - scoreA;
      })
      .slice(0, 4);
  },

  async listSimilarListings(listing: Listing): Promise<Listing[]> {
    const all = dbStore
      .getListings()
      .filter((l) => l.id !== listing.id && !l.isHiddenByModeration && !l.isPaused);

    return all
      .sort((a, b) => {
        const scoreA =
          (a.category === listing.category ? 3 : 0) +
          (a.college === listing.college ? 2 : 0);
        const scoreB =
          (b.category === listing.category ? 3 : 0) +
          (b.college === listing.college ? 2 : 0);
        return scoreB - scoreA;
      })
      .slice(0, 4);
  },

  async listSavedSearches(userId: string): Promise<SavedSearch[]> {
    return dbStore
      .getSavedSearches()
      .filter((s) => s.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async createSavedSearch(input: {
    userId: string;
    label: string;
    query: string;
    category: string;
    college: string;
    priceFilter: string;
    alertEnabled?: boolean;
  }): Promise<SavedSearch> {
    const entry: SavedSearch = {
      id: `srs_${Date.now().toString(36)}`,
      userId: input.userId,
      label: input.label.trim() || input.query.trim() || input.category || 'Campus search',
      query: input.query.trim(),
      category: input.category,
      college: input.college,
      priceFilter: input.priceFilter,
      alertEnabled: input.alertEnabled ?? true,
      createdAt: new Date().toISOString(),
    };
    const existing = dbStore.getSavedSearches();
    dbStore.saveSavedSearches([entry, ...existing]);
    emitStoreChange();
    return entry;
  },

  async toggleSavedSearchAlert(id: string, userId: string): Promise<void> {
    const list = dbStore.getSavedSearches();
    dbStore.saveSavedSearches(
      list.map((s) =>
        s.id === id && s.userId === userId ? { ...s, alertEnabled: !s.alertEnabled } : s,
      ),
    );
    emitStoreChange();
  },

  async deleteSavedSearch(id: string, userId: string): Promise<void> {
    const list = dbStore.getSavedSearches();
    dbStore.saveSavedSearches(list.filter((s) => !(s.id === id && s.userId === userId)));
    emitStoreChange();
  },

  async checkSavedSearchAlertsForNewListing(listing: Listing): Promise<void> {
    const searches = dbStore
      .getSavedSearches()
      .filter((s) => s.alertEnabled && s.userId !== listing.ownerId);

    for (const s of searches) {
      const catOk = !s.category || s.category === 'All' || s.category === listing.category;
      const collegeOk =
        !s.college ||
        s.college === 'All Campuses' ||
        listing.college.toLowerCase().includes(s.college.toLowerCase());
      const queryOk =
        !s.query ||
        `${listing.title} ${listing.description} ${listing.category}`
          .toLowerCase()
          .includes(s.query.toLowerCase());
      let priceOk = true;
      if (s.priceFilter === 'under_150') priceOk = listing.pricePerDay < 150;
      if (s.priceFilter === '150_300') {
        priceOk = listing.pricePerDay >= 150 && listing.pricePerDay <= 300;
      }
      if (s.priceFilter === 'above_300') priceOk = listing.pricePerDay > 300;

      if (catOk && collegeOk && queryOk && priceOk) {
        await notificationsService.createNotification({
          userId: s.userId,
          type: 'wishlist_available',
          title: `New match for "${s.label}"`,
          body: `${listing.title} was just listed on ${listing.college} at ₹${listing.pricePerDay}/day.`,
          link: `/listing/${listing.id}`,
          meta: { savedSearchId: s.id, listingId: listing.id },
        });
      }
    }
  },

  async listWantedPosts(): Promise<WantedPost[]> {
    return dbStore.getWantedPosts().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async createWantedPost(input: {
    requesterId: string;
    title: string;
    category: ListingCategory;
    budgetPerDay: number;
    neededFrom: string;
    neededTo: string;
    college: string;
    details: string;
  }): Promise<WantedPost> {
    if (!input.title.trim()) throw new Error('Enter what item you are looking for.');
    if (!input.neededFrom || !input.neededTo || input.neededTo < input.neededFrom) {
      throw new Error('Select a valid date range.');
    }
    const post: WantedPost = {
      id: `want_${Date.now().toString(36)}`,
      requesterId: input.requesterId,
      title: input.title.trim(),
      category: input.category,
      budgetPerDay: Math.max(20, Math.round(Number(input.budgetPerDay) || 100)),
      neededFrom: input.neededFrom,
      neededTo: input.neededTo,
      college: input.college.trim() || 'Campus',
      details: input.details.trim(),
      status: 'Open',
      responses: [],
      createdAt: new Date().toISOString(),
    };
    const posts = dbStore.getWantedPosts();
    dbStore.saveWantedPosts([post, ...posts]);
    emitStoreChange();
    return post;
  },

  async addWantedResponse(input: {
    postId: string;
    responderId: string;
    message: string;
    listingId?: string;
    offeredPricePerDay?: number;
  }): Promise<WantedPost> {
    const posts = dbStore.getWantedPosts();
    const target = posts.find((p) => p.id === input.postId);
    if (!target) throw new Error('Wanted post not found.');
    if (!input.message.trim()) throw new Error('Enter a short message for your offer.');

    const response: WantedResponse = {
      id: `wresp_${Date.now().toString(36)}`,
      responderId: input.responderId,
      listingId: input.listingId || undefined,
      message: input.message.trim(),
      offeredPricePerDay: input.offeredPricePerDay
        ? Math.round(Number(input.offeredPricePerDay))
        : undefined,
      createdAt: new Date().toISOString(),
    };

    const updated: WantedPost = {
      ...target,
      responses: [...target.responses, response],
    };
    dbStore.saveWantedPosts(posts.map((p) => (p.id === input.postId ? updated : p)));

    if (target.requesterId !== input.responderId) {
      await notificationsService.createNotification({
        userId: target.requesterId,
        type: 'message_new',
        title: 'Someone responded to your Wanted post',
        body: `Offer on "${target.title}": ${response.message.slice(0, 80)}`,
        link: '/wanted',
      });
    }

    emitStoreChange();
    return updated;
  },

  async markWantedFulfilled(postId: string, actorId: string): Promise<WantedPost> {
    const posts = dbStore.getWantedPosts();
    const target = posts.find((p) => p.id === postId);
    if (!target) throw new Error('Wanted post not found.');
    if (target.requesterId !== actorId) {
      throw new Error('Only the requester can mark this post fulfilled.');
    }
    const updated: WantedPost = { ...target, status: 'Fulfilled' };
    dbStore.saveWantedPosts(posts.map((p) => (p.id === postId ? updated : p)));
    emitStoreChange();
    return updated;
  },
};
