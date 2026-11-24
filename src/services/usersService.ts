import {
  DEFAULT_NOTIFICATION_SETTINGS,
  isAdminEmail,
  type NotificationSettingsMap,
  type PrivacySettings,
  type UserProfile,
} from '../types/rentigo';
import { referralsService } from './referralsService';
import { dbStore, emitStoreChange } from './storage';

function generateReferralCode(firstName: string): string {
  const prefix = (firstName.replace(/[^a-zA-Z]/g, '').slice(0, 5) || 'RENT').toUpperCase();
  const suffix = Math.floor(10 + Math.random() * 89);
  return `${prefix}${suffix}`;
}

export const usersService = {
  async listUsers(): Promise<UserProfile[]> {
    return dbStore.getUsers();
  },

  async getById(id: string): Promise<UserProfile | null> {
    const users = dbStore.getUsers();
    return users.find((u) => u.id === id) ?? null;
  },

  async getCurrentUser(): Promise<UserProfile | null> {
    const id = dbStore.getSessionUserId();
    if (!id) return null;
    const found = await this.getById(id);
    if (!found || found.isBanned) {
      dbStore.setSessionUserId(null);
      return null;
    }
    return found;
  },

  async signInWithGooglePreset(userId: string): Promise<UserProfile> {
    const users = dbStore.getUsers();
    const found = users.find((u) => u.id === userId);
    if (!found) throw new Error('Account not found.');
    if (found.isBanned) {
      throw new Error('This account has been suspended by campus moderation.');
    }
    dbStore.setSessionUserId(found.id);
    emitStoreChange();
    return found;
  },

  async signInWithGoogleCustom(input: {
    name: string;
    email: string;
    college: string;
    phone: string;
    referralCode?: string;
  }): Promise<UserProfile> {
    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();
    const college = input.college.trim();
    const phone = input.phone.trim();

    if (!name || !email.includes('@') || !college || !phone) {
      throw new Error('Please complete your name, email, college, and WhatsApp number.');
    }

    const users = dbStore.getUsers();
    const existing = users.find((u) => u.email.toLowerCase() === email);
    const adminUser = isAdminEmail(email);
    if (existing) {
      if (existing.isBanned) {
        throw new Error('This account has been suspended by campus moderation.');
      }
      const updated: UserProfile = {
        ...existing,
        name,
        firstName: name.split(/\s+/)[0] || name,
        college,
        phone,
        role: adminUser ? 'admin' : existing.role,
        isVerified: adminUser ? true : existing.isVerified,
        verificationStatus: adminUser ? 'verified' : existing.verificationStatus,
      };
      dbStore.saveUsers(users.map((u) => (u.id === existing.id ? updated : u)));
      dbStore.setSessionUserId(updated.id);
      emitStoreChange();
      return updated;
    }

    const firstName = name.split(/\s+/)[0] || name;
    const isEduDomain =
      adminUser ||
      email.endsWith('.edu') ||
      email.endsWith('.ac.in') ||
      email.endsWith('.edu.in');

    const newUser: UserProfile = {
      id: `usr_${Date.now().toString(36)}`,
      name,
      firstName,
      email,
      college,
      phone,
      photoUrl: '',
      role: adminUser ? 'admin' : 'student',
      rating: 5.0,
      reviewCount: 0,
      completedRentalsCount: 0,
      avgResponseMinutes: 15,
      isVerified: isEduDomain,
      verificationStatus: isEduDomain ? 'verified' : 'unverified',
      verifiedCollegeEmail: isEduDomain ? email : undefined,
      referralCode: generateReferralCode(firstName),
      creditBalance: 0,
      language: 'en',
      privacySettings: { hideLastName: false, hidePhoneUntilAccepted: true },
      notificationSettings: { ...DEFAULT_NOTIFICATION_SETTINGS },
      joinedAt: new Date().toISOString(),
    };

    dbStore.saveUsers([newUser, ...users]);
    dbStore.setSessionUserId(newUser.id);

    const refToApply = input.referralCode?.trim() || dbStore.getPendingReferralCode();
    if (refToApply) {
      try {
        await referralsService.applyReferralCode(newUser.id, refToApply);
      } catch {
        // Ignore invalid/self referral codes on signup gracefully
      } finally {
        dbStore.setPendingReferralCode(null);
      }
    }

    emitStoreChange();
    return (await this.getById(newUser.id)) ?? newUser;
  },

  async updateProfile(
    userId: string,
    patch: Partial<
      Pick<
        UserProfile,
        'name' | 'college' | 'phone' | 'photoUrl' | 'language' | 'privacySettings' | 'notificationSettings'
      >
    >,
  ): Promise<UserProfile> {
    const users = dbStore.getUsers();
    const target = users.find((u) => u.id === userId);
    if (!target) throw new Error('User profile not found.');

    const nextName = (patch.name ?? target.name).trim();
    const nextPrivacy: PrivacySettings = patch.privacySettings
      ? { ...target.privacySettings, ...patch.privacySettings }
      : target.privacySettings;
    const nextNotif: NotificationSettingsMap = patch.notificationSettings
      ? { ...target.notificationSettings, ...patch.notificationSettings }
      : target.notificationSettings;

    const updated: UserProfile = {
      ...target,
      ...patch,
      name: nextName,
      firstName: nextName.split(/\s+/)[0] || nextName,
      privacySettings: nextPrivacy,
      notificationSettings: nextNotif,
    };
    dbStore.saveUsers(users.map((u) => (u.id === userId ? updated : u)));
    emitStoreChange();
    return updated;
  },

  exportUserDataSync(userId: string): Record<string, unknown> {
    const user = dbStore.getUsers().find((u) => u.id === userId) ?? null;
    const listings = dbStore.getListings().filter((l) => l.ownerId === userId);
    const requests = dbStore
      .getRequests()
      .filter((r) => r.renterId === userId || r.ownerId === userId);
    const reviews = dbStore
      .getReviews()
      .filter((r) => r.reviewerId === userId || r.revieweeId === userId);
    const payments = dbStore
      .getPayments()
      .filter((p) => p.payerId === userId || p.payeeId === userId);
    const wishlists = dbStore.getWishlists().filter((w) => w.userId === userId);

    return {
      exportedAt: new Date().toISOString(),
      platform: 'Rentigo',
      profile: user,
      listings,
      requests,
      reviews,
      payments,
      wishlists,
    };
  },

  async deleteAccount(userId: string): Promise<void> {
    const users = dbStore.getUsers();
    dbStore.saveUsers(users.filter((u) => u.id !== userId));
    dbStore.saveListings(dbStore.getListings().filter((l) => l.ownerId !== userId));
    dbStore.saveWishlists(dbStore.getWishlists().filter((w) => w.userId !== userId));
    dbStore.saveNotifications(dbStore.getNotifications().filter((n) => n.userId !== userId));
    dbStore.saveSavedSearches(dbStore.getSavedSearches().filter((s) => s.userId !== userId));
    if (dbStore.getSessionUserId() === userId) {
      dbStore.setSessionUserId(null);
    }
    emitStoreChange();
  },

  async signOut(): Promise<void> {
    dbStore.setSessionUserId(null);
    emitStoreChange();
  },
};
