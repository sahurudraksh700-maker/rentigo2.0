import type {
  CancellationPolicy,
  ItemCondition,
  Listing,
  ListingCategory,
  ModerationReport,
} from '../types/rentigo';
import { extractCampusName } from '../utils/badges';
import { expandDateRange, todayIsoDate } from '../utils/dates';
import { discoveryService } from './discoveryService';
import { moderationService } from './moderationService';
import { dbStore, emitStoreChange } from './storage';
import { wishlistService } from './wishlistService';

export interface ListingInput {
  ownerId: string;
  title: string;
  description: string;
  category: ListingCategory;
  photos: string[];
  pricePerDay: number;
  deposit: number;
  lateFeePerDay?: number;
  cancellationPolicy?: CancellationPolicy;
  condition: ItemCondition;
  pickupLocation: string;
  college?: string;
  availableFrom: string;
  availableTo: string;
}

export const listingsService = {
  async listAll(): Promise<Listing[]> {
    return dbStore.getListings().filter((l) => !l.isHiddenByModeration);
  },

  async listAllIncludingHidden(): Promise<Listing[]> {
    return dbStore.getListings();
  },

  async getById(id: string): Promise<Listing | null> {
    const items = dbStore.getListings();
    return items.find((item) => item.id === id) ?? null;
  },

  async listByOwner(ownerId: string): Promise<Listing[]> {
    return dbStore.getListings().filter((item) => item.ownerId === ownerId);
  },

  async incrementViewCount(id: string): Promise<void> {
    const items = dbStore.getListings();
    let changed = false;
    const next = items.map((l) => {
      if (l.id === id) {
        changed = true;
        return { ...l, viewCount: (l.viewCount || 0) + 1 };
      }
      return l;
    });
    if (changed) dbStore.saveListings(next);
  },

  async create(input: ListingInput): Promise<Listing> {
    const owner = dbStore.getUsers().find((u) => u.id === input.ownerId);
    if (!owner) throw new Error('Account not found.');
    if (owner.isBanned) throw new Error('Account suspended.');

    const settings = dbStore.getPlatformSettings();
    if (settings.requireVerificationToTransact && !owner.isVerified) {
      throw new Error(
        'Please verify your student status in Settings before publishing a listing.',
      );
    }

    const pricePerDay = Math.round(Number(input.pricePerDay));
    const defaultLateFee = Math.max(50, Math.round(pricePerDay * 0.5));
    const campus = input.college?.trim() || extractCampusName(owner.college);

    const newItem: Listing = {
      id: `lst_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      ownerId: input.ownerId,
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      photos: input.photos.slice(0, 4),
      pricePerDay,
      deposit: Math.round(Number(input.deposit)),
      lateFeePerDay:
        input.lateFeePerDay !== undefined
          ? Math.max(0, Math.round(Number(input.lateFeePerDay)))
          : defaultLateFee,
      cancellationPolicy: input.cancellationPolicy ?? 'Flexible',
      condition: input.condition,
      pickupLocation: input.pickupLocation.trim(),
      college: campus,
      availableFrom: input.availableFrom,
      availableTo: input.availableTo,
      isPaused: false,
      viewCount: 0,
      reportCount: 0,
      createdAt: new Date().toISOString(),
    };

    const items = dbStore.getListings();
    dbStore.saveListings([newItem, ...items]);
    await discoveryService.checkSavedSearchAlertsForNewListing(newItem);
    emitStoreChange();
    return newItem;
  },

  async update(
    id: string,
    ownerId: string,
    patch: Partial<Omit<ListingInput, 'ownerId'>> & { isPaused?: boolean },
  ): Promise<Listing> {
    const items = dbStore.getListings();
    const existing = items.find((item) => item.id === id);
    if (!existing) throw new Error('Listing not found.');
    if (existing.ownerId !== ownerId) {
      throw new Error('Only the owner can modify this listing.');
    }

    const updated: Listing = {
      ...existing,
      ...patch,
      title: (patch.title ?? existing.title).trim(),
      description: (patch.description ?? existing.description).trim(),
      pickupLocation: (patch.pickupLocation ?? existing.pickupLocation).trim(),
      college: (patch.college ?? existing.college).trim(),
      photos: patch.photos ? patch.photos.slice(0, 4) : existing.photos,
      pricePerDay:
        patch.pricePerDay !== undefined
          ? Math.round(Number(patch.pricePerDay))
          : existing.pricePerDay,
      deposit:
        patch.deposit !== undefined ? Math.round(Number(patch.deposit)) : existing.deposit,
      lateFeePerDay:
        patch.lateFeePerDay !== undefined
          ? Math.max(0, Math.round(Number(patch.lateFeePerDay)))
          : existing.lateFeePerDay,
    };

    dbStore.saveListings(items.map((item) => (item.id === id ? updated : item)));

    if (updated.isPaused) {
      wishlistService.markWatchersUnavailable(id);
    } else if (existing.isPaused && !updated.isPaused) {
      await wishlistService.notifySavedUsersIfAvailable(id);
    }

    emitStoreChange();
    return updated;
  },

  async togglePause(id: string, ownerId: string): Promise<Listing> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Listing not found.');
    return this.update(id, ownerId, { isPaused: !existing.isPaused });
  },

  async remove(id: string, ownerId: string): Promise<void> {
    const items = dbStore.getListings();
    const existing = items.find((item) => item.id === id);
    if (!existing) throw new Error('Listing not found.');
    if (existing.ownerId !== ownerId) {
      throw new Error('Only the owner can delete this listing.');
    }
    dbStore.saveListings(items.filter((item) => item.id !== id));
    emitStoreChange();
  },

  getBookedDatesSync(listingId: string): string[] {
    const requests = dbStore.getRequests();
    const booked = new Set<string>();
    for (const req of requests) {
      if (req.listingId === listingId && req.status === 'Accepted') {
        for (const day of expandDateRange(req.startDate, req.endDate)) {
          booked.add(day);
        }
      }
    }
    return Array.from(booked).sort();
  },

  isRentedTodaySync(listingId: string): boolean {
    const today = todayIsoDate();
    const booked = this.getBookedDatesSync(listingId);
    return booked.includes(today);
  },

  async reportListing(input: {
    listingId: string;
    reporterId: string;
    reason: string;
    details: string;
  }): Promise<ModerationReport> {
    const { report } = await moderationService.submitReport({
      targetType: 'listing',
      targetId: input.listingId,
      listingId: input.listingId,
      reporterId: input.reporterId,
      reason: input.reason,
      details: input.details,
    });
    return report;
  },
};
