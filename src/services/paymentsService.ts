import type { PaymentRecord } from '../types/rentigo';
import { dbStore, emitStoreChange } from './storage';

export interface OwnerEarningsItemBreakdown {
  listingId: string;
  listingTitle: string;
  completedCount: number;
  activeCount: number;
  earnedAmount: number;
  pendingAmount: number;
}

export interface OwnerEarningsSummary {
  totalEarned: number;
  pendingEarnings: number;
  depositsHeld: number;
  perItem: OwnerEarningsItemBreakdown[];
}

export const paymentsService = {
  async createTestPayment(input: {
    requestId: string;
    listingId: string;
    payerId: string;
    payeeId: string;
    method: PaymentRecord['method'];
    upiId?: string;
    rentalSubtotal: number;
    depositAmount: number;
    creditsApplied: number;
  }): Promise<PaymentRecord> {
    const gross = input.rentalSubtotal + input.depositAmount;
    const amountPaid = Math.max(0, gross - input.creditsApplied);
    const payment: PaymentRecord = {
      id: `pay_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      receiptNumber: `RNT-${Date.now().toString().slice(-6)}`,
      requestId: input.requestId,
      listingId: input.listingId,
      payerId: input.payerId,
      payeeId: input.payeeId,
      method: amountPaid === 0 ? 'credits_only' : input.method,
      upiId: input.upiId?.trim() || undefined,
      rentalSubtotal: input.rentalSubtotal,
      depositAmount: input.depositAmount,
      creditsApplied: input.creditsApplied,
      amountPaid,
      mode: 'TEST',
      status: 'paid_test',
      createdAt: new Date().toISOString(),
    };
    const existing = dbStore.getPayments();
    dbStore.savePayments([payment, ...existing]);
    emitStoreChange();
    return payment;
  },

  async listByUser(userId: string): Promise<PaymentRecord[]> {
    return dbStore
      .getPayments()
      .filter((p) => p.payerId === userId || p.payeeId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getByRequestId(requestId: string): Promise<PaymentRecord | null> {
    return dbStore.getPayments().find((p) => p.requestId === requestId) ?? null;
  },

  async listAll(): Promise<PaymentRecord[]> {
    return dbStore.getPayments();
  },

  async getOwnerEarningsSummary(ownerId: string): Promise<OwnerEarningsSummary> {
    const requests = dbStore.getRequests().filter((r) => r.ownerId === ownerId);
    const listingsById = new Map(dbStore.getListings().map((l) => [l.id, l]));

    let totalEarned = 0;
    let pendingEarnings = 0;
    let depositsHeld = 0;
    const itemMap = new Map<string, OwnerEarningsItemBreakdown>();

    for (const req of requests) {
      const listingTitle = listingsById.get(req.listingId)?.title ?? 'Campus Item';
      const entry = itemMap.get(req.listingId) ?? {
        listingId: req.listingId,
        listingTitle,
        completedCount: 0,
        activeCount: 0,
        earnedAmount: 0,
        pendingAmount: 0,
      };

      const baseRental = req.days * req.pricePerDaySnapshot;
      if (req.status === 'Returned') {
        const earned = baseRental + (req.lateFeeCharged || 0) + (req.depositDeductionAmount || 0);
        totalEarned += earned;
        entry.completedCount += 1;
        entry.earnedAmount += earned;
      } else if (req.status === 'Accepted') {
        pendingEarnings += baseRental;
        depositsHeld += req.depositSnapshot;
        entry.activeCount += 1;
        entry.pendingAmount += baseRental;
      }

      itemMap.set(req.listingId, entry);
    }

    return {
      totalEarned,
      pendingEarnings,
      depositsHeld,
      perItem: Array.from(itemMap.values()).sort(
        (a, b) => b.earnedAmount + b.pendingAmount - (a.earnedAmount + a.pendingAmount),
      ),
    };
  },
};
