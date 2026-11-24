import type {
  DepositStatus,
  HandoverChecklist,
  PaymentRecord,
  RentalRequest,
  RequestStatus,
} from '../types/rentigo';
import { countInclusiveDays, datesOverlap } from '../utils/dates';
import { notificationsService } from './notificationsService';
import { paymentsService } from './paymentsService';
import { referralsService } from './referralsService';
import { dbStore, emitStoreChange } from './storage';
import { wishlistService } from './wishlistService';

export interface CreateRequestInput {
  listingId: string;
  renterId: string;
  startDate: string;
  endDate: string;
  message: string;
  creditsToUse?: number;
  paymentMethod?: PaymentRecord['method'];
  upiId?: string;
}

export interface ReturnSettlementInput {
  depositStatus: DepositStatus;
  depositDeductionAmount?: number;
  depositDeductionReason?: string;
  lateDays?: number;
}

export const requestsService = {
  async listAll(): Promise<RentalRequest[]> {
    return dbStore.getRequests().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async listByRenter(renterId: string): Promise<RentalRequest[]> {
    return dbStore
      .getRequests()
      .filter((r) => r.renterId === renterId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async listByOwner(ownerId: string): Promise<RentalRequest[]> {
    return dbStore
      .getRequests()
      .filter((r) => r.ownerId === ownerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async create(input: CreateRequestInput): Promise<RentalRequest> {
    const users = dbStore.getUsers();
    const renter = users.find((u) => u.id === input.renterId);
    if (!renter) throw new Error('Account not found.');
    if (renter.isBanned) throw new Error('Your account is suspended.');

    const settings = dbStore.getPlatformSettings();
    if (settings.requireVerificationToTransact && !renter.isVerified) {
      throw new Error(
        'Please verify your student status in Settings before sending a rental request.',
      );
    }

    const listings = dbStore.getListings();
    const listing = listings.find((l) => l.id === input.listingId);
    if (!listing || listing.isHiddenByModeration) {
      throw new Error('Listing is no longer available.');
    }
    if (listing.isPaused) throw new Error('This listing is currently paused by the owner.');
    if (listing.ownerId === input.renterId) {
      throw new Error('You cannot request to rent your own item.');
    }
    if (!input.startDate || !input.endDate) {
      throw new Error('Select both start and end dates.');
    }
    if (input.endDate < input.startDate) {
      throw new Error('End date cannot be earlier than start date.');
    }
    if (input.startDate < listing.availableFrom || input.endDate > listing.availableTo) {
      throw new Error(
        `Dates must fall within the available window (${listing.availableFrom} to ${listing.availableTo}).`,
      );
    }

    const existing = dbStore.getRequests();
    const overlappingAccepted = existing.find(
      (r) =>
        r.listingId === listing.id &&
        r.status === 'Accepted' &&
        datesOverlap(r.startDate, r.endDate, input.startDate, input.endDate),
    );
    if (overlappingAccepted) {
      throw new Error(
        `Those dates overlap an existing confirmed booking (${overlappingAccepted.startDate} to ${overlappingAccepted.endDate}).`,
      );
    }

    const days = countInclusiveDays(input.startDate, input.endDate);
    const rentalSubtotal = days * listing.pricePerDay;
    const grossTotal = rentalSubtotal + listing.deposit;
    const now = new Date().toISOString();
    const requestId = `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;

    const requestedCredits = Math.min(grossTotal, Math.max(0, input.creditsToUse || 0));
    const creditsUsed =
      requestedCredits > 0
        ? await referralsService.redeemCredits(renter.id, requestedCredits, requestId)
        : 0;
    const totalAmount = Math.max(0, grossTotal - creditsUsed);

    const payment = await paymentsService.createTestPayment({
      requestId,
      listingId: listing.id,
      payerId: renter.id,
      payeeId: listing.ownerId,
      method: input.paymentMethod ?? 'upi_test',
      upiId: input.upiId,
      rentalSubtotal,
      depositAmount: listing.deposit,
      creditsApplied: creditsUsed,
    });

    const created: RentalRequest = {
      id: requestId,
      listingId: listing.id,
      renterId: input.renterId,
      ownerId: listing.ownerId,
      startDate: input.startDate,
      endDate: input.endDate,
      days,
      pricePerDaySnapshot: listing.pricePerDay,
      depositSnapshot: listing.deposit,
      lateFeePerDaySnapshot: listing.lateFeePerDay || 100,
      cancellationPolicySnapshot: listing.cancellationPolicy || 'Flexible',
      creditsUsed,
      totalAmount,
      paymentId: payment.id,
      message: input.message.trim(),
      status: 'Pending',
      depositStatus: 'Held',
      createdAt: now,
      updatedAt: now,
    };

    dbStore.saveRequests([created, ...existing]);

    await notificationsService.createNotification({
      userId: listing.ownerId,
      type: 'request_new',
      title: 'New rental request',
      body: `${renter.firstName} wants "${listing.title}" from ${input.startDate} to ${input.endDate}.`,
      link: '/dashboard',
      meta: { requestId: created.id },
    });

    emitStoreChange();
    return created;
  },

  async submitHandoverChecklist(input: {
    requestId: string;
    actorId: string;
    stage: 'pickup' | 'return';
    itemsChecked: string[];
    conditionNotes: string;
    photos: string[];
  }): Promise<RentalRequest> {
    const requests = dbStore.getRequests();
    const target = requests.find((r) => r.id === input.requestId);
    if (!target) throw new Error('Booking not found.');

    const isOwner = target.ownerId === input.actorId;
    const isRenter = target.renterId === input.actorId;
    if (!isOwner && !isRenter) {
      throw new Error('Only booking participants can update handover checklists.');
    }

    const existing =
      input.stage === 'pickup' ? target.pickupChecklist : target.returnChecklist;
    const nextChecklist: HandoverChecklist = {
      confirmedByOwner: existing?.confirmedByOwner || isOwner,
      confirmedByRenter: existing?.confirmedByRenter || isRenter,
      itemsChecked: input.itemsChecked,
      conditionNotes: input.conditionNotes.trim(),
      photos: input.photos.slice(0, 4),
      submittedBy: input.actorId,
      submittedAt: new Date().toISOString(),
    };

    const updated: RentalRequest = {
      ...target,
      pickupChecklist: input.stage === 'pickup' ? nextChecklist : target.pickupChecklist,
      returnChecklist: input.stage === 'return' ? nextChecklist : target.returnChecklist,
      updatedAt: new Date().toISOString(),
    };
    dbStore.saveRequests(requests.map((r) => (r.id === input.requestId ? updated : r)));
    emitStoreChange();
    return updated;
  },

  async updateStatus(
    requestId: string,
    actorId: string,
    nextStatus: RequestStatus,
    settlement?: ReturnSettlementInput,
  ): Promise<RentalRequest> {
    const requests = dbStore.getRequests();
    const target = requests.find((r) => r.id === requestId);
    if (!target) throw new Error('Rental request not found.');

    const isOwner = target.ownerId === actorId;
    const isRenter = target.renterId === actorId;

    if (nextStatus === 'Accepted' || nextStatus === 'Declined' || nextStatus === 'Returned') {
      if (!isOwner) throw new Error('Only the item owner can perform this action.');
    }
    if (nextStatus === 'Cancelled') {
      if (!isRenter) throw new Error('Only the renter can cancel this request.');
    }

    if (nextStatus === 'Accepted') {
      if (target.status !== 'Pending') throw new Error('Only pending requests can be accepted.');
      const conflict = requests.find(
        (r) =>
          r.id !== target.id &&
          r.listingId === target.listingId &&
          r.status === 'Accepted' &&
          datesOverlap(r.startDate, r.endDate, target.startDate, target.endDate),
      );
      if (conflict) {
        throw new Error(
          `Cannot accept: overlaps with an already accepted booking (${conflict.startDate} to ${conflict.endDate}).`,
        );
      }
    } else if (nextStatus === 'Declined') {
      if (target.status !== 'Pending') throw new Error('Only pending requests can be declined.');
    } else if (nextStatus === 'Cancelled') {
      if (target.status !== 'Pending' && target.status !== 'Accepted') {
        throw new Error('Only pending or accepted requests can be cancelled.');
      }
    } else if (nextStatus === 'Returned') {
      if (target.status !== 'Accepted') {
        throw new Error('Only active accepted rentals can be marked as returned.');
      }
    }

    const now = new Date().toISOString();
    let nextDepositStatus = target.depositStatus;
    let depositDeductionAmount = target.depositDeductionAmount;
    let depositDeductionReason = target.depositDeductionReason;
    let lateDays = target.lateDays;
    let lateFeeCharged = target.lateFeeCharged;

    if (nextStatus === 'Returned') {
      nextDepositStatus = settlement?.depositStatus ?? 'Released';
      lateDays = Math.max(0, Math.round(settlement?.lateDays ?? 0));
      lateFeeCharged = lateDays * (target.lateFeePerDaySnapshot || 0);
      if (nextDepositStatus === 'Partially Deducted') {
        depositDeductionAmount = Math.min(
          target.depositSnapshot,
          Math.max(1, Math.round(settlement?.depositDeductionAmount ?? 0)),
        );
        depositDeductionReason =
          settlement?.depositDeductionReason?.trim() || 'Recorded at return inspection';
      } else {
        depositDeductionAmount = 0;
        depositDeductionReason = undefined;
      }
    } else if (nextStatus === 'Declined' || nextStatus === 'Cancelled') {
      nextDepositStatus = 'Released';
      if (target.creditsUsed > 0) {
        await referralsService.refundCredits(
          target.renterId,
          target.creditsUsed,
          target.id,
          `Credits refunded (${nextStatus.toLowerCase()} booking)`,
        );
      }
    }

    const updated: RentalRequest = {
      ...target,
      status: nextStatus,
      depositStatus: nextDepositStatus,
      depositDeductionAmount,
      depositDeductionReason,
      lateDays,
      lateFeeCharged,
      updatedAt: now,
    };

    dbStore.saveRequests(requests.map((r) => (r.id === requestId ? updated : r)));

    const listing = dbStore.getListings().find((l) => l.id === target.listingId);
    const listingTitle = listing?.title ?? 'your campus rental';

    if (nextStatus === 'Accepted') {
      wishlistService.markWatchersUnavailable(target.listingId);
      await notificationsService.createNotification({
        userId: target.renterId,
        type: 'request_accepted',
        title: 'Rental request accepted',
        body: `Your booking for "${listingTitle}" (${target.startDate} to ${target.endDate}) was accepted! WhatsApp contact is now unlocked.`,
        link: '/dashboard',
        meta: { requestId: target.id },
      });
    } else if (nextStatus === 'Declined') {
      await notificationsService.createNotification({
        userId: target.renterId,
        type: 'request_declined',
        title: 'Rental request declined',
        body: `Your request for "${listingTitle}" was declined by the owner.`,
        link: '/browse',
        meta: { requestId: target.id },
      });
    } else if (nextStatus === 'Cancelled') {
      await notificationsService.createNotification({
        userId: target.ownerId,
        type: 'request_cancelled',
        title: 'Booking cancelled by renter',
        body: `The request for "${listingTitle}" (${target.startDate} to ${target.endDate}) was cancelled (${target.cancellationPolicySnapshot} policy).`,
        link: '/dashboard',
        meta: { requestId: target.id },
      });
      await wishlistService.notifySavedUsersIfAvailable(target.listingId);
    } else if (nextStatus === 'Returned') {
      // Increment completed rentals count for both participants
      const users = dbStore.getUsers();
      dbStore.saveUsers(
        users.map((u) =>
          u.id === target.ownerId || u.id === target.renterId
            ? { ...u, completedRentalsCount: (u.completedRentalsCount || 0) + 1 }
            : u,
        ),
      );

      await notificationsService.createNotification({
        userId: target.renterId,
        type: 'request_returned',
        title: 'Item marked returned — leave a review',
        body: `"${listingTitle}" is marked returned (deposit: ${nextDepositStatus}). Rate your classmate to help campus trust!`,
        link: '/dashboard',
        meta: { requestId: target.id },
      });

      await referralsService.processFirstCompletedRental(target.renterId);
      await wishlistService.notifySavedUsersIfAvailable(target.listingId);
    }

    emitStoreChange();
    return updated;
  },
};
