export const LISTING_CATEGORIES = [
  'Cameras',
  'Projectors',
  'Formal Wear',
  'Cycles',
  'Books',
  'Electronics',
  'Sports',
  'Other',
] as const;

export type ListingCategory = (typeof LISTING_CATEGORIES)[number];

export type ItemCondition = 'New' | 'Good' | 'Fair';

export type CancellationPolicy = 'Flexible' | 'Moderate' | 'Strict';

export type RequestStatus =
  | 'Pending'
  | 'Accepted'
  | 'Returned'
  | 'Declined'
  | 'Cancelled';

export type DepositStatus = 'Held' | 'Released' | 'Partially Deducted';

export type UserRole = 'student' | 'admin';

export const ADMIN_EMAILS = [
  'sahurudraksh700@gmail.com',
  'rhea.admin@rentigo.app',
] as const;

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return (ADMIN_EMAILS as readonly string[]).includes(normalized);
}

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export type AppLanguage = 'en' | 'hi';

export type NotificationType =
  | 'request_new'
  | 'request_accepted'
  | 'request_declined'
  | 'request_cancelled'
  | 'request_returned'
  | 'message_new'
  | 'review_received'
  | 'wishlist_available'
  | 'referral_reward'
  | 'return_reminder';

export interface NotificationSettingsMap {
  request_new: boolean;
  request_accepted: boolean;
  request_declined: boolean;
  request_cancelled: boolean;
  request_returned: boolean;
  message_new: boolean;
  review_received: boolean;
  wishlist_available: boolean;
  referral_reward: boolean;
  return_reminder: boolean;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettingsMap = {
  request_new: true,
  request_accepted: true,
  request_declined: true,
  request_cancelled: true,
  request_returned: true,
  message_new: true,
  review_received: true,
  wishlist_available: true,
  referral_reward: true,
  return_reminder: true,
};

export interface PrivacySettings {
  hideLastName: boolean;
  hidePhoneUntilAccepted: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  firstName: string;
  email: string;
  college: string;
  phone: string;
  photoUrl: string;
  role: UserRole;
  rating: number;
  reviewCount: number;
  completedRentalsCount: number;
  avgResponseMinutes: number;
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  verifiedCollegeEmail?: string;
  isBanned?: boolean;
  referralCode: string;
  referredByUserId?: string;
  referredByCode?: string;
  creditBalance: number;
  language: AppLanguage;
  privacySettings: PrivacySettings;
  notificationSettings: NotificationSettingsMap;
  joinedAt: string;
}

export interface Listing {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  category: ListingCategory;
  photos: string[];
  pricePerDay: number;
  deposit: number;
  lateFeePerDay: number;
  cancellationPolicy: CancellationPolicy;
  condition: ItemCondition;
  pickupLocation: string;
  college: string;
  availableFrom: string; // YYYY-MM-DD
  availableTo: string;   // YYYY-MM-DD
  isPaused: boolean;
  viewCount: number;
  reportCount: number;
  isHiddenByModeration?: boolean;
  createdAt: string;
}

export interface HandoverChecklist {
  confirmedByOwner: boolean;
  confirmedByRenter: boolean;
  itemsChecked: string[];
  conditionNotes: string;
  photos: string[];
  submittedBy: string;
  submittedAt: string;
}

export interface RentalRequest {
  id: string;
  listingId: string;
  renterId: string;
  ownerId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  days: number;
  pricePerDaySnapshot: number;
  depositSnapshot: number;
  lateFeePerDaySnapshot: number;
  cancellationPolicySnapshot: CancellationPolicy;
  creditsUsed: number;
  totalAmount: number;
  paymentId?: string;
  message: string;
  status: RequestStatus;
  depositStatus: DepositStatus;
  depositDeductionAmount?: number;
  depositDeductionReason?: string;
  lateDays?: number;
  lateFeeCharged?: number;
  pickupChecklist?: HandoverChecklist;
  returnChecklist?: HandoverChecklist;
  disputeTicketId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WishlistItem {
  id: string;
  userId: string;
  listingId: string;
  wasUnavailableWhenSaved: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  listingId: string;
  renterId: string;
  ownerId: string;
  participantIds: [string, string];
  lastMessageText: string;
  lastMessageAt: string;
  lastSenderId: string;
  unreadCountByUser: Record<string, number>;
  typingByUser: Record<string, string>; // userId -> ISO timestamp
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  imageUrl?: string;
  readAt?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  requestId: string;
  listingId: string;
  reviewerId: string;
  revieweeId: string;
  role: 'renter_to_owner' | 'owner_to_renter';
  rating: number;
  comment: string;
  tags: string[];
  ownerReply?: {
    text: string;
    createdAt: string;
  };
  reportCount: number;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  isRead: boolean;
  meta?: Record<string, string>;
  createdAt: string;
}

export interface ReferralRecord {
  id: string;
  referrerId: string;
  refereeId: string;
  code: string;
  status: 'signed_up' | 'rewarded';
  rewardAmount: number;
  createdAt: string;
  rewardedAt?: string;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number; // positive credit, negative debit
  type: 'referral_bonus' | 'checkout_redemption' | 'refund';
  description: string;
  requestId?: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  receiptNumber: string;
  requestId: string;
  listingId: string;
  payerId: string;
  payeeId: string;
  method: 'upi_test' | 'card_test' | 'credits_only';
  upiId?: string;
  rentalSubtotal: number;
  depositAmount: number;
  creditsApplied: number;
  amountPaid: number;
  mode: 'TEST';
  status: 'paid_test' | 'refunded_test';
  createdAt: string;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  method: 'college_email_otp' | 'student_id_photo';
  collegeEmail?: string;
  idPhotoUrl?: string;
  studentIdNumber?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export type ReportTargetType = 'listing' | 'user' | 'message' | 'review';

export interface ModerationReport {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  listingId?: string;
  targetUserId?: string;
  reporterId: string;
  reason: string;
  details: string;
  status: 'pending' | 'dismissed' | 'action_taken';
  createdAt: string;
}

export interface UserBlock {
  id: string;
  blockerId: string;
  blockedUserId: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  type: 'support' | 'dispute';
  subject: string;
  description: string;
  bookingId?: string;
  listingId?: string;
  attachments?: {
    photos: string[];
    checklistSummary?: string;
  };
  status: 'open' | 'in_review' | 'resolved';
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedSearch {
  id: string;
  userId: string;
  label: string;
  query: string;
  category: string;
  college: string;
  priceFilter: string;
  alertEnabled: boolean;
  createdAt: string;
}

export interface WantedResponse {
  id: string;
  responderId: string;
  listingId?: string;
  message: string;
  offeredPricePerDay?: number;
  createdAt: string;
}

export interface WantedPost {
  id: string;
  requesterId: string;
  title: string;
  category: ListingCategory;
  budgetPerDay: number;
  neededFrom: string;
  neededTo: string;
  college: string;
  details: string;
  status: 'Open' | 'Fulfilled';
  responses: WantedResponse[];
  createdAt: string;
}

export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  category: string;
  updatedAt: string;
}

export interface PlatformSettings {
  requireVerificationToTransact: boolean;
  autoHideReportThreshold: number;
  defaultReferralReward: number;
}
