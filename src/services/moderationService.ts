import type {
  ModerationReport,
  ReportTargetType,
  SupportTicket,
  UserBlock,
} from '../types/rentigo';
import { dbStore, emitStoreChange } from './storage';

export const moderationService = {
  async submitReport(input: {
    targetType: ReportTargetType;
    targetId: string;
    listingId?: string;
    targetUserId?: string;
    reporterId: string;
    reason: string;
    details: string;
  }): Promise<{ report: ModerationReport; autoHiddenListing: boolean }> {
    const reports = dbStore.getReports();
    const duplicate = reports.find(
      (r) =>
        r.targetType === input.targetType &&
        r.targetId === input.targetId &&
        r.reporterId === input.reporterId &&
        r.status === 'pending',
    );
    if (duplicate) {
      throw new Error('You have already submitted an open report for this item.');
    }

    const report: ModerationReport = {
      id: `rep_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      targetType: input.targetType,
      targetId: input.targetId,
      listingId: input.listingId,
      targetUserId: input.targetUserId,
      reporterId: input.reporterId,
      reason: input.reason.trim(),
      details: input.details.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const nextReports = [report, ...reports];
    dbStore.saveReports(nextReports);

    let autoHiddenListing = false;
    if (input.targetType === 'listing') {
      const settings = dbStore.getPlatformSettings();
      const pendingCount = nextReports.filter(
        (r) => r.targetType === 'listing' && r.targetId === input.targetId && r.status === 'pending',
      ).length;
      const listings = dbStore.getListings();
      dbStore.saveListings(
        listings.map((l) => {
          if (l.id !== input.targetId) return l;
          const shouldHide = pendingCount >= settings.autoHideReportThreshold;
          if (shouldHide) autoHiddenListing = true;
          return {
            ...l,
            reportCount: (l.reportCount || 0) + 1,
            isHiddenByModeration: l.isHiddenByModeration || shouldHide,
          };
        }),
      );
    } else if (input.targetType === 'review') {
      const reviews = dbStore.getReviews();
      dbStore.saveReviews(
        reviews.map((rev) =>
          rev.id === input.targetId ? { ...rev, reportCount: (rev.reportCount || 0) + 1 } : rev,
        ),
      );
    }

    emitStoreChange();
    return { report, autoHiddenListing };
  },

  async listReports(): Promise<ModerationReport[]> {
    return dbStore.getReports().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async resolveReport(
    reportId: string,
    adminId: string,
    action: 'dismiss' | 'remove_listing' | 'ban_user',
  ): Promise<void> {
    const admin = dbStore.getUsers().find((u) => u.id === adminId);
    if (!admin || admin.role !== 'admin') {
      throw new Error('Admin privileges required.');
    }

    const reports = dbStore.getReports();
    const target = reports.find((r) => r.id === reportId);
    if (!target) throw new Error('Report not found.');

    if (action === 'remove_listing') {
      const listingId = target.listingId ?? (target.targetType === 'listing' ? target.targetId : undefined);
      if (listingId) {
        const listings = dbStore.getListings();
        dbStore.saveListings(
          listings.map((l) => (l.id === listingId ? { ...l, isHiddenByModeration: true } : l)),
        );
      }
    } else if (action === 'ban_user') {
      const targetUid =
        target.targetUserId ?? (target.targetType === 'user' ? target.targetId : undefined);
      if (targetUid && targetUid !== adminId) {
        const users = dbStore.getUsers();
        dbStore.saveUsers(
          users.map((u) => (u.id === targetUid ? { ...u, isBanned: true } : u)),
        );
      }
    }

    dbStore.saveReports(
      reports.map((r) =>
        r.id === reportId
          ? { ...r, status: action === 'dismiss' ? 'dismissed' : 'action_taken' }
          : r,
      ),
    );
    emitStoreChange();
  },

  async blockUser(blockerId: string, blockedUserId: string): Promise<UserBlock> {
    if (blockerId === blockedUserId) throw new Error('You cannot block yourself.');
    const blocks = dbStore.getBlocks();
    const existing = blocks.find(
      (b) => b.blockerId === blockerId && b.blockedUserId === blockedUserId,
    );
    if (existing) return existing;

    const created: UserBlock = {
      id: `blk_${Date.now().toString(36)}`,
      blockerId,
      blockedUserId,
      createdAt: new Date().toISOString(),
    };
    dbStore.saveBlocks([created, ...blocks]);
    emitStoreChange();
    return created;
  },

  async unblockUser(blockerId: string, blockedUserId: string): Promise<void> {
    const blocks = dbStore.getBlocks();
    dbStore.saveBlocks(
      blocks.filter((b) => !(b.blockerId === blockerId && b.blockedUserId === blockedUserId)),
    );
    emitStoreChange();
  },

  isBlockedPairSync(userA: string, userB: string): boolean {
    const blocks = dbStore.getBlocks();
    return blocks.some(
      (b) =>
        (b.blockerId === userA && b.blockedUserId === userB) ||
        (b.blockerId === userB && b.blockedUserId === userA),
    );
  },

  didUserBlockSync(blockerId: string, targetUserId: string): boolean {
    return dbStore
      .getBlocks()
      .some((b) => b.blockerId === blockerId && b.blockedUserId === targetUserId);
  },

  async listBlockedUsersFor(blockerId: string): Promise<string[]> {
    return dbStore
      .getBlocks()
      .filter((b) => b.blockerId === blockerId)
      .map((b) => b.blockedUserId);
  },

  async createSupportTicket(input: {
    userId: string;
    type: 'support' | 'dispute';
    subject: string;
    description: string;
    bookingId?: string;
    listingId?: string;
    attachments?: { photos: string[]; checklistSummary?: string };
  }): Promise<SupportTicket> {
    const now = new Date().toISOString();
    const ticket: SupportTicket = {
      id: `tkt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      userId: input.userId,
      type: input.type,
      subject: input.subject.trim(),
      description: input.description.trim(),
      bookingId: input.bookingId,
      listingId: input.listingId,
      attachments: input.attachments,
      status: 'open',
      createdAt: now,
      updatedAt: now,
    };
    const tickets = dbStore.getSupportTickets();
    dbStore.saveSupportTickets([ticket, ...tickets]);

    if (input.bookingId && input.type === 'dispute') {
      const reqs = dbStore.getRequests();
      dbStore.saveRequests(
        reqs.map((r) => (r.id === input.bookingId ? { ...r, disputeTicketId: ticket.id } : r)),
      );
    }

    emitStoreChange();
    return ticket;
  },

  async listSupportTickets(): Promise<SupportTicket[]> {
    return dbStore.getSupportTickets().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async updateTicketStatus(
    ticketId: string,
    adminId: string,
    status: SupportTicket['status'],
    adminNotes?: string,
  ): Promise<SupportTicket> {
    const admin = dbStore.getUsers().find((u) => u.id === adminId);
    if (!admin || admin.role !== 'admin') {
      throw new Error('Admin privileges required.');
    }
    const tickets = dbStore.getSupportTickets();
    const target = tickets.find((t) => t.id === ticketId);
    if (!target) throw new Error('Ticket not found.');

    const updated: SupportTicket = {
      ...target,
      status,
      adminNotes: adminNotes !== undefined ? adminNotes.trim() : target.adminNotes,
      updatedAt: new Date().toISOString(),
    };
    dbStore.saveSupportTickets(tickets.map((t) => (t.id === ticketId ? updated : t)));
    emitStoreChange();
    return updated;
  },

  async setUserBan(userId: string, adminId: string, banned: boolean): Promise<void> {
    const admin = dbStore.getUsers().find((u) => u.id === adminId);
    if (!admin || admin.role !== 'admin') throw new Error('Admin privileges required.');
    if (userId === adminId) throw new Error('Admins cannot ban themselves.');

    const users = dbStore.getUsers();
    dbStore.saveUsers(users.map((u) => (u.id === userId ? { ...u, isBanned: banned } : u)));
    emitStoreChange();
  },

  async setListingHidden(listingId: string, adminId: string, hidden: boolean): Promise<void> {
    const admin = dbStore.getUsers().find((u) => u.id === adminId);
    if (!admin || admin.role !== 'admin') throw new Error('Admin privileges required.');

    const listings = dbStore.getListings();
    dbStore.saveListings(
      listings.map((l) => (l.id === listingId ? { ...l, isHiddenByModeration: hidden } : l)),
    );
    emitStoreChange();
  },
};
