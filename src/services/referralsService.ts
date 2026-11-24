import type { CreditTransaction, ReferralRecord } from '../types/rentigo';
import { notificationsService } from './notificationsService';
import { dbStore, emitStoreChange } from './storage';

export interface ReferralStats {
  referralCode: string;
  shareUrl: string;
  invitedCount: number;
  rewardedCount: number;
  totalEarned: number;
  creditBalance: number;
  records: ReferralRecord[];
  transactions: CreditTransaction[];
}

export const referralsService = {
  buildShareUrl(code: string): string {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/?ref=${encodeURIComponent(code)}`;
    }
    return `https://rentigo.app/?ref=${encodeURIComponent(code)}`;
  },

  async getStatsForUser(userId: string): Promise<ReferralStats> {
    const user = dbStore.getUsers().find((u) => u.id === userId);
    const referralCode = user?.referralCode || 'RENT50';
    const records = dbStore
      .getReferrals()
      .filter((r) => r.referrerId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const transactions = dbStore
      .getCreditTransactions()
      .filter((t) => t.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const rewardedCount = records.filter((r) => r.status === 'rewarded').length;
    const totalEarned = transactions
      .filter((t) => t.type === 'referral_bonus' && t.amount > 0)
      .reduce((acc, t) => acc + t.amount, 0);

    return {
      referralCode,
      shareUrl: this.buildShareUrl(referralCode),
      invitedCount: records.length,
      rewardedCount,
      totalEarned,
      creditBalance: user?.creditBalance ?? 0,
      records,
      transactions,
    };
  },

  async applyReferralCode(refereeId: string, rawCode: string): Promise<ReferralRecord> {
    const code = rawCode.trim().toUpperCase();
    if (!code) throw new Error('Enter a referral code.');

    const users = dbStore.getUsers();
    const referee = users.find((u) => u.id === refereeId);
    if (!referee) throw new Error('Account not found.');

    if (referee.referredByUserId) {
      throw new Error('A referral code has already been applied to your account.');
    }

    const referrer = users.find((u) => u.referralCode.toUpperCase() === code);
    if (!referrer) throw new Error('Referral code not found.');

    if (referrer.id === referee.id || referrer.email.toLowerCase() === referee.email.toLowerCase()) {
      throw new Error('Self-referrals are not allowed.');
    }

    const existingRecords = dbStore.getReferrals();
    if (existingRecords.some((r) => r.refereeId === referee.id)) {
      throw new Error('You have already redeemed a signup referral.');
    }

    const rewardAmount = dbStore.getPlatformSettings().defaultReferralReward || 50;
    const record: ReferralRecord = {
      id: `ref_${Date.now().toString(36)}`,
      referrerId: referrer.id,
      refereeId: referee.id,
      code: referrer.referralCode,
      status: 'signed_up',
      rewardAmount,
      createdAt: new Date().toISOString(),
    };

    dbStore.saveReferrals([record, ...existingRecords]);
    dbStore.saveUsers(
      users.map((u) =>
        u.id === referee.id
          ? { ...u, referredByUserId: referrer.id, referredByCode: referrer.referralCode }
          : u,
      ),
    );
    emitStoreChange();
    return record;
  },

  /**
   * Credits ₹50 to BOTH referrer and referee exactly ONCE when the referee
   * completes their first Returned rental.
   */
  async processFirstCompletedRental(renterId: string): Promise<boolean> {
    const referrals = dbStore.getReferrals();
    const pendingRef = referrals.find(
      (r) => r.refereeId === renterId && r.status === 'signed_up',
    );
    if (!pendingRef) return false;

    const returnedByRenter = dbStore
      .getRequests()
      .filter((req) => req.renterId === renterId && req.status === 'Returned');
    if (returnedByRenter.length === 0) return false;

    const users = dbStore.getUsers();
    const referrer = users.find((u) => u.id === pendingRef.referrerId);
    const referee = users.find((u) => u.id === pendingRef.refereeId);
    if (!referrer || !referee || referrer.id === referee.id) return false;

    const reward = pendingRef.rewardAmount || 50;
    const now = new Date().toISOString();

    const txReferrer: CreditTransaction = {
      id: `ctx_${Date.now().toString(36)}_r1`,
      userId: referrer.id,
      amount: reward,
      type: 'referral_bonus',
      description: `Referral bonus — ${referee.firstName} completed their first rental`,
      createdAt: now,
    };
    const txReferee: CreditTransaction = {
      id: `ctx_${Date.now().toString(36)}_r2`,
      userId: referee.id,
      amount: reward,
      type: 'referral_bonus',
      description: `Welcome referral reward via ${referrer.referralCode}`,
      createdAt: now,
    };

    dbStore.saveUsers(
      users.map((u) => {
        if (u.id === referrer.id || u.id === referee.id) {
          return { ...u, creditBalance: (u.creditBalance || 0) + reward };
        }
        return u;
      }),
    );

    dbStore.saveReferrals(
      referrals.map((r) =>
        r.id === pendingRef.id ? { ...r, status: 'rewarded', rewardedAt: now } : r,
      ),
    );

    const txs = dbStore.getCreditTransactions();
    dbStore.saveCreditTransactions([txReferrer, txReferee, ...txs]);

    await notificationsService.createNotification({
      userId: referrer.id,
      type: 'referral_reward',
      title: `You earned ₹${reward} in Rentigo credits`,
      body: `${referee.firstName} completed their first campus rental using your link.`,
      link: '/referrals',
    });

    await notificationsService.createNotification({
      userId: referee.id,
      type: 'referral_reward',
      title: `₹${reward} referral credit unlocked`,
      body: `Thanks for completing your first rental! ₹${reward} is ready for your next booking.`,
      link: '/referrals',
    });

    emitStoreChange();
    return true;
  },

  async redeemCredits(userId: string, requestedAmount: number, requestId: string): Promise<number> {
    if (requestedAmount <= 0) return 0;
    const users = dbStore.getUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) throw new Error('Account not found.');

    const usable = Math.min(Math.floor(requestedAmount), user.creditBalance || 0);
    if (usable <= 0) return 0;

    const tx: CreditTransaction = {
      id: `ctx_${Date.now().toString(36)}`,
      userId,
      amount: -usable,
      type: 'checkout_redemption',
      description: 'Applied Rentigo credits at rental checkout',
      requestId,
      createdAt: new Date().toISOString(),
    };

    dbStore.saveUsers(
      users.map((u) =>
        u.id === userId ? { ...u, creditBalance: Math.max(0, (u.creditBalance || 0) - usable) } : u,
      ),
    );
    dbStore.saveCreditTransactions([tx, ...dbStore.getCreditTransactions()]);
    emitStoreChange();
    return usable;
  },

  async refundCredits(
    userId: string,
    amount: number,
    requestId: string,
    reason: string,
  ): Promise<void> {
    if (amount <= 0) return;
    const users = dbStore.getUsers();
    const tx: CreditTransaction = {
      id: `ctx_${Date.now().toString(36)}_ref`,
      userId,
      amount,
      type: 'refund',
      description: reason,
      requestId,
      createdAt: new Date().toISOString(),
    };
    dbStore.saveUsers(
      users.map((u) => (u.id === userId ? { ...u, creditBalance: (u.creditBalance || 0) + amount } : u)),
    );
    dbStore.saveCreditTransactions([tx, ...dbStore.getCreditTransactions()]);
    emitStoreChange();
  },
};
