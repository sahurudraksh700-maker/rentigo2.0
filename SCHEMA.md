# Rentigo Data Schema & Collections

Rentigo implements an async service layer in `src/services/` backed by `localStorage` (`src/services/storage.ts`), structured cleanly to mirror Firestore collections so each service can be swapped 1:1 with Firebase SDK calls. Corresponding security rules live in `/firestore.rules`.

## Collections & Services

### 1. `users` (`usersService.ts`)
- `id`: `string` (`usr_...`)
- `name`, `firstName`, `email`, `college`, `phone`, `photoUrl`
- `role`: `'student' | 'admin'`
- `rating`: `number` (auto-recalculated from reviews)
- `reviewCount`: `number`
- `completedRentalsCount`: `number` (for **Top lender** badge: `rating >= 4.5 && completedRentalsCount >= 5`)
- `avgResponseMinutes`: `number` (for **Quick responder** badge: `<= 30`)
- `isVerified`: `boolean`
- `verificationStatus`: `'unverified' | 'pending' | 'verified' | 'rejected'`
- `isBanned`: `boolean`
- `referralCode`: `string` (unique)
- `referredByUserId?`: `string`
- `creditBalance`: `number` (₹ wallet balance)
- `language`: `'en' | 'hi'`
- `privacySettings`: `{ hideLastName: boolean; hidePhoneUntilAccepted: boolean }`
- `notificationSettings`: `Record<NotificationType, boolean>`
- `joinedAt`: ISO timestamp

### 2. `listings` (`listingsService.ts`)
- `id`, `ownerId`, `title`, `description`, `category`, `photos[]`, `pricePerDay`, `deposit`, `condition`, `pickupLocation`
- `college`: `string`
- `availableFrom`, `availableTo` (`YYYY-MM-DD`)
- `lateFeePerDay`: `number`
- `cancellationPolicy`: `'Flexible' | 'Moderate' | 'Strict'`
- `isPaused`: `boolean`
- `viewCount`: `number`
- `reportCount`: `number`
- `isHiddenByModeration`: `boolean` (auto-set when pending reports reach threshold `3`)
- `createdAt`: ISO timestamp

### 3. `requests` & `handoverChecklists` (`requestsService.ts`)
- `id`, `listingId`, `renterId`, `ownerId`, `startDate`, `endDate`, `days`
- `pricePerDaySnapshot`, `depositSnapshot`, `lateFeePerDaySnapshot`, `cancellationPolicySnapshot`
- `creditsUsed`: `number`
- `totalAmount`: `number`
- `paymentId?`: `string`
- `status`: `'Pending' | 'Accepted' | 'Returned' | 'Declined' | 'Cancelled'`
- `depositStatus`: `'Held' | 'Released' | 'Partially Deducted'`
- `depositDeductionAmount?`, `depositDeductionReason?`, `lateDays?`, `lateFeeCharged?`
- `pickupChecklist?`: `HandoverChecklist` (`confirmedByOwner`, `confirmedByRenter`, `itemsChecked[]`, `conditionNotes`, `photos[]`, `submittedAt`, `submittedBy`)
- `returnChecklist?`: `HandoverChecklist`
- `disputeTicketId?`: `string`
- `createdAt`, `updatedAt`

### 4. `wishlists` (`wishlistService.ts`)
- `id`, `userId`, `listingId`, `wasUnavailableWhenSaved`, `createdAt`

### 5. `conversations` & `messages` (`chatService.ts`)
- `Conversation`: `id` (deterministic per `listingId + sorted(renterId, ownerId)`), `listingId`, `renterId`, `ownerId`, `participantIds[]`, `lastMessageText`, `lastMessageAt`, `lastSenderId`, `unreadCountByUser`, `typingByUser`
- `ChatMessage`: `id`, `conversationId`, `senderId`, `text`, `imageUrl?`, `readAt?`, `createdAt`

### 6. `reviews` (`reviewsService.ts`)
- `id`, `requestId`, `listingId`, `reviewerId`, `revieweeId`, `role` (`'renter_to_owner' | 'owner_to_renter'`)
- `rating` (`1..5`), `comment`, `tags[]`, `ownerReply?` (`{ text, createdAt }`), `reportCount`, `createdAt`

### 7. `notifications` (`notificationsService.ts`)
- `id`, `userId`, `type` (`request_new`, `request_accepted`, `request_declined`, `request_cancelled`, `request_returned`, `message_new`, `review_received`, `wishlist_available`, `referral_reward`, `return_reminder`), `title`, `body`, `link`, `isRead`, `meta?`, `createdAt`

### 8. `referrals` & `creditTransactions` (`referralsService.ts`)
- `ReferralRecord`: `id`, `referrerId`, `refereeId`, `code`, `status` (`'signed_up' | 'rewarded'`), `rewardAmount`, `createdAt`, `rewardedAt?`
- `CreditTransaction`: `id`, `userId`, `amount`, `type` (`'referral_bonus' | 'checkout_redemption' | 'refund'`), `description`, `requestId?`, `createdAt`

### 9. `payments` (`paymentsService.ts`)
- `PaymentRecord`: `id`, `receiptNumber`, `requestId`, `listingId`, `payerId`, `payeeId`, `method` (`'upi_test' | 'card_test' | 'credits_only'`), `upiId?`, `rentalSubtotal`, `depositAmount`, `creditsApplied`, `amountPaid`, `mode` (`'TEST'`), `status` (`'paid_test' | 'refunded_test'`), `createdAt`

### 10. `verifications` (`verificationsService.ts`)
- `VerificationRequest`: `id`, `userId`, `method` (`'college_email_otp' | 'student_id_photo'`), `collegeEmail?`, `idPhotoUrl?`, `status` (`'pending' | 'approved' | 'rejected'`), `rejectionReason?`, `reviewedBy?`, `reviewedAt?`, `createdAt`

### 11. `reports`, `blocks`, `supportTickets` (`moderationService.ts`)
- `ModerationReport`: `id`, `targetType` (`'listing' | 'user' | 'message' | 'review'`), `targetId`, `listingId?`, `targetUserId?`, `reporterId`, `reason`, `details`, `status` (`'pending' | 'dismissed' | 'action_taken'`), `createdAt`
- `UserBlock`: `id`, `blockerId`, `blockedUserId`, `createdAt`
- `SupportTicket`: `id`, `userId`, `type` (`'support' | 'dispute'`), `subject`, `description`, `bookingId?`, `attachments?` (handover photos + checklists), `status` (`'open' | 'in_review' | 'resolved'`), `adminNotes?`, `createdAt`, `updatedAt`

### 12. `savedSearches`, `wantedPosts`, `recentlyViewed` (`discoveryService.ts`)
- `SavedSearch`: `id`, `userId`, `label`, `query`, `category`, `college`, `priceFilter`, `alertEnabled`, `createdAt`
- `WantedPost`: `id`, `requesterId`, `title`, `category`, `budgetPerDay`, `neededFrom`, `neededTo`, `college`, `details`, `status` (`'Open' | 'Fulfilled'`), `responses[]`, `createdAt`

### 13. `faqEntries` & `platformSettings` (`faqService.ts`)
- `FaqEntry`: `id`, `question`, `answer`, `keywords[]`, `category`, `updatedAt`
- `PlatformSettings`: `{ requireVerificationToTransact: boolean, autoHideReportThreshold: number, defaultReferralReward: number }`
