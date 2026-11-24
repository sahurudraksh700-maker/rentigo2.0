import type { Review } from '../types/rentigo';
import { notificationsService } from './notificationsService';
import { dbStore, emitStoreChange } from './storage';

export const REVIEW_TAGS = [
  'On time',
  'Item as described',
  'Careful with item',
  'Quick responder',
  'Smooth handover',
] as const;

function recalculateUserRating(userId: string, reviews: Review[]): void {
  const received = reviews.filter((r) => r.revieweeId === userId);
  const count = received.length;
  const avg =
    count === 0
      ? 5.0
      : Number((received.reduce((acc, r) => acc + r.rating, 0) / count).toFixed(1));

  const users = dbStore.getUsers();
  dbStore.saveUsers(
    users.map((u) => (u.id === userId ? { ...u, rating: avg, reviewCount: count } : u)),
  );
}

export const reviewsService = {
  async listAll(): Promise<Review[]> {
    return dbStore.getReviews().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async listForListing(listingId: string): Promise<Review[]> {
    return dbStore
      .getReviews()
      .filter((r) => r.listingId === listingId && r.role === 'renter_to_owner')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async listForUser(userId: string): Promise<Review[]> {
    return dbStore
      .getReviews()
      .filter((r) => r.revieweeId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async listByRequest(requestId: string): Promise<Review[]> {
    return dbStore.getReviews().filter((r) => r.requestId === requestId);
  },

  getListingRatingSummarySync(listingId: string): { average: number; count: number } {
    const reviews = dbStore
      .getReviews()
      .filter((r) => r.listingId === listingId && r.role === 'renter_to_owner');
    if (reviews.length === 0) return { average: 0, count: 0 };
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    return { average: Number(avg.toFixed(1)), count: reviews.length };
  },

  async create(input: {
    requestId: string;
    reviewerId: string;
    rating: number;
    comment: string;
    tags: string[];
  }): Promise<Review> {
    const req = dbStore.getRequests().find((r) => r.id === input.requestId);
    if (!req) throw new Error('Booking not found.');
    if (req.status !== 'Returned') {
      throw new Error('Reviews unlock only after the rental is marked Returned.');
    }

    const isRenter = req.renterId === input.reviewerId;
    const isOwner = req.ownerId === input.reviewerId;
    if (!isRenter && !isOwner) {
      throw new Error('Only booking participants can leave a review.');
    }

    const existing = dbStore.getReviews();
    if (
      existing.some(
        (r) => r.requestId === input.requestId && r.reviewerId === input.reviewerId,
      )
    ) {
      throw new Error('You have already submitted your review for this booking.');
    }

    const rating = Math.min(5, Math.max(1, Math.round(Number(input.rating))));
    const comment = input.comment.trim();
    if (!comment) throw new Error('Please write a short comment about your experience.');

    const revieweeId = isRenter ? req.ownerId : req.renterId;
    const role: Review['role'] = isRenter ? 'renter_to_owner' : 'owner_to_renter';

    const created: Review = {
      id: `rev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      requestId: req.id,
      listingId: req.listingId,
      reviewerId: input.reviewerId,
      revieweeId,
      role,
      rating,
      comment,
      tags: input.tags.slice(0, 4),
      reportCount: 0,
      createdAt: new Date().toISOString(),
    };

    const nextReviews = [created, ...existing];
    dbStore.saveReviews(nextReviews);
    recalculateUserRating(revieweeId, nextReviews);

    const reviewer = dbStore.getUsers().find((u) => u.id === input.reviewerId);
    await notificationsService.createNotification({
      userId: revieweeId,
      type: 'review_received',
      title: `New ${rating}-star review received`,
      body: `${reviewer?.firstName ?? 'A classmate'} left a review: "${comment.slice(0, 80)}"`,
      link: `/u/${revieweeId}`,
    });

    emitStoreChange();
    return created;
  },

  async replyToReview(reviewId: string, actorId: string, text: string): Promise<Review> {
    const reviews = dbStore.getReviews();
    const target = reviews.find((r) => r.id === reviewId);
    if (!target) throw new Error('Review not found.');
    if (target.revieweeId !== actorId) {
      throw new Error('Only the reviewed member can reply.');
    }
    if (target.ownerReply) {
      throw new Error('You have already replied to this review.');
    }
    const clean = text.trim();
    if (!clean) throw new Error('Enter a reply.');

    const updated: Review = {
      ...target,
      ownerReply: {
        text: clean,
        createdAt: new Date().toISOString(),
      },
    };
    dbStore.saveReviews(reviews.map((r) => (r.id === reviewId ? updated : r)));
    emitStoreChange();
    return updated;
  },
};
