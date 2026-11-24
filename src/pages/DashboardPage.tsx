import {
  AlertTriangle,
  Camera,
  Check,
  CheckSquare,
  Copy,
  Gift,
  IndianRupee,
  MessageCircle,
  MessageSquare,
  PauseCircle,
  Pencil,
  Phone,
  PlayCircle,
  Plus,
  Receipt,
  Settings,
  Star,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { HandoverModal } from '../components/HandoverModal';
import { ReceiptModal } from '../components/ReceiptModal';
import { ReturnSettleModal } from '../components/ReturnSettleModal';
import { ReviewModal } from '../components/ReviewModal';
import { TrustBadges } from '../components/TrustBadges';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { chatService } from '../services/chatService';
import { listingsService } from '../services/listingsService';
import { moderationService } from '../services/moderationService';
import { paymentsService, type OwnerEarningsSummary } from '../services/paymentsService';
import { requestsService } from '../services/requestsService';
import { reviewsService } from '../services/reviewsService';
import { usersService } from '../services/usersService';
import type {
  Listing,
  PaymentRecord,
  RentalRequest,
  RequestStatus,
  Review,
  UserProfile,
} from '../types/rentigo';
import { formatDisplayDate } from '../utils/dates';
import { usePageMeta } from '../utils/seo';

type DashboardTab = 'listings' | 'received' | 'rentals';

function StatusText({ status }: { status: RequestStatus }) {
  const styles: Record<RequestStatus, string> = {
    Pending: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30',
    Accepted:
      'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    Returned: 'text-slate-600 dark:text-slate-300 bg-slate-500/10 border-slate-500/30',
    Declined: 'text-[#e63f24] bg-[#e63f24]/10 border-[#e63f24]/30',
    Cancelled: 'text-slate-500 dark:text-slate-400 bg-slate-500/10 border-slate-500/20',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}

export function DashboardPage() {
  const { user, openSignIn, refreshUsers } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  usePageMeta({ title: 'Dashboard — Rentigo' });

  const initialTab = (searchParams.get('tab') as DashboardTab) || 'listings';
  const [tab, setTab] = useState<DashboardTab>(
    ['listings', 'received', 'rentals'].includes(initialTab) ? initialTab : 'listings',
  );

  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<RentalRequest[]>([]);
  const [myRentals, setMyRentals] = useState<RentalRequest[]>([]);
  const [listingsMap, setListingsMap] = useState<Record<string, Listing>>({});
  const [usersMap, setUsersMap] = useState<Record<string, UserProfile>>({});
  const [reviews, setReviews] = useState<Review[]>([]);
  const [paymentsByReq, setPaymentsByReq] = useState<Record<string, PaymentRecord>>({});
  const [earnings, setEarnings] = useState<OwnerEarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [handoverTarget, setHandoverTarget] = useState<{
    req: RentalRequest;
    stage: 'pickup' | 'return';
  } | null>(null);
  const [returnTarget, setReturnTarget] = useState<RentalRequest | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{
    req: RentalRequest;
    targetName: string;
  } | null>(null);
  const [receiptTarget, setReceiptTarget] = useState<{
    payment: PaymentRecord;
    req: RentalRequest;
  } | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [
        allListings,
        allUsers,
        received,
        rentals,
        allReviews,
        userPayments,
        ownerEarnings,
      ] = await Promise.all([
        listingsService.listAllIncludingHidden(),
        usersService.listUsers(),
        requestsService.listByOwner(user.id),
        requestsService.listByRenter(user.id),
        reviewsService.listAll(),
        paymentsService.listByUser(user.id),
        paymentsService.getOwnerEarningsSummary(user.id),
      ]);

      const lMap: Record<string, Listing> = {};
      for (const l of allListings) lMap[l.id] = l;
      const uMap: Record<string, UserProfile> = {};
      for (const u of allUsers) uMap[u.id] = u;
      const pMap: Record<string, PaymentRecord> = {};
      for (const p of userPayments) pMap[p.requestId] = p;

      setListingsMap(lMap);
      setUsersMap(uMap);
      setPaymentsByReq(pMap);
      setReviews(allReviews);
      setEarnings(ownerEarnings);
      setMyListings(allListings.filter((l) => l.ownerId === user.id));
      setReceivedRequests(received);
      setMyRentals(rentals);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const paramTab = searchParams.get('tab') as DashboardTab | null;
    if (paramTab && ['listings', 'received', 'rentals'].includes(paramTab)) {
      setTab(paramTab);
    }
  }, [searchParams]);

  const switchTab = (next: DashboardTab) => {
    setTab(next);
    const params = new URLSearchParams(searchParams);
    params.set('tab', next);
    setSearchParams(params, { replace: true });
  };

  if (!user) {
    return (
      <main className="max-w-xl mx-auto px-4 sm:px-6 py-16">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-8 text-center">
          <h1 className="text-2xl font-normal text-slate-950 dark:text-white">
            Your Campus Dashboard
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Sign in with Google to manage your posted items, incoming requests, handover checklists, and earnings.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => openSignIn('/dashboard')}
              className="px-5 py-2.5 rounded-xl bg-[#e63f24] hover:bg-[#cc3118] text-white text-sm font-medium transition-colors"
            >
              Sign in with Google
            </button>
            <Link
              to="/browse"
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Browse items
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const handleTogglePause = async (listingId: string) => {
    try {
      const updated = await listingsService.togglePause(listingId, user.id);
      showToast(updated.isPaused ? 'Listing paused' : 'Listing resumed', 'info');
      await loadDashboard();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update.', 'error');
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    try {
      await listingsService.remove(listingId, user.id);
      setConfirmDeleteId(null);
      showToast('Listing removed', 'info');
      await loadDashboard();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete.', 'error');
    }
  };

  const handleRequestAction = async (
    requestId: string,
    nextStatus: RequestStatus,
  ) => {
    try {
      await requestsService.updateStatus(requestId, user.id, nextStatus);
      await refreshUsers();
      const msgs: Record<RequestStatus, string> = {
        Pending: 'Updated',
        Accepted: 'Request accepted! WhatsApp contact is now shared.',
        Returned: 'Marked as returned. Deposit settled!',
        Declined: 'Request declined.',
        Cancelled: 'Request cancelled.',
      };
      showToast(
        msgs[nextStatus],
        nextStatus === 'Accepted' || nextStatus === 'Returned' ? 'success' : 'info',
      );
      await loadDashboard();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Action failed.', 'error');
    }
  };

  const handleOpenChat = async (req: RentalRequest) => {
    try {
      const conv = await chatService.getOrCreateConversation({
        listingId: req.listingId,
        renterId: req.renterId,
        ownerId: req.ownerId,
      });
      navigate(`/messages?conv=${encodeURIComponent(conv.id)}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to open chat', 'error');
    }
  };

  const handleOpenDispute = async (req: RentalRequest) => {
    const item = listingsMap[req.listingId];
    const photos = [
      ...(req.pickupChecklist?.photos ?? []),
      ...(req.returnChecklist?.photos ?? []),
    ];
    const checklistSummary = [
      req.pickupChecklist
        ? `Pickup: ${req.pickupChecklist.itemsChecked.join(', ')} (${req.pickupChecklist.conditionNotes || 'No notes'})`
        : 'Pickup checklist not submitted',
      req.returnChecklist
        ? `Return: ${req.returnChecklist.itemsChecked.join(', ')} (${req.returnChecklist.conditionNotes || 'No notes'})`
        : 'Return checklist not submitted',
    ].join(' | ');

    try {
      const ticket = await moderationService.createSupportTicket({
        userId: user.id,
        type: 'dispute',
        subject: `Booking dispute: ${item?.title ?? req.id}`,
        description: `Dispute opened for booking ${req.id} (${req.startDate} to ${req.endDate}). Deposit status: ${req.depositStatus}.`,
        bookingId: req.id,
        listingId: req.listingId,
        attachments: { photos, checklistSummary },
      });
      showToast(`Dispute ticket #${ticket.id} opened for admin review`, 'info');
      await loadDashboard();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not create dispute', 'error');
    }
  };

  const hasUserReviewed = (requestId: string) =>
    reviews.some((r) => r.requestId === requestId && r.reviewerId === user.id);

  const copyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      showToast(`Copied ${phone}`, 'success');
    } catch {
      showToast(phone, 'info');
    }
  };

  const formatWaNumber = (phone: string) => phone.replace(/[^0-9]/g, '');

  const pendingIncomingCount = receivedRequests.filter(
    (r) => r.status === 'Pending',
  ).length;

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Profile & Earnings Summary */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#e63f24] text-white text-xl font-semibold flex items-center justify-center shrink-0">
              {user.firstName.charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-normal text-slate-950 dark:text-white">
                  {user.name}
                </h1>
                <TrustBadges user={user} compact />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span>{user.college}</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-200 tabular-nums">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {user.rating.toFixed(1)} ({user.reviewCount})
                </span>
                <span aria-hidden="true">·</span>
                <Link to={`/u/${user.id}`} className="text-[#e63f24] hover:underline">
                  View public profile
                </Link>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/referrals"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs font-medium text-emerald-700 dark:text-emerald-300"
            >
              <Gift className="w-3.5 h-3.5" />
              <span>Credits: ₹{(user.creditBalance || 0).toLocaleString('en-IN')}</span>
            </Link>
            <Link
              to="/settings"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-[#e63f24] transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </Link>
            <Link
              to="/listings/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#e63f24] hover:bg-[#cc3118] text-white text-xs font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>List an Item</span>
            </Link>
          </div>
        </div>

        {/* Owner Earnings Summary Strip */}
        {earnings && (
          <div className="pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 tabular-nums">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] p-4">
              <div className="text-xs text-slate-500">Total Earned (Completed)</div>
              <div className="mt-1 text-xl font-semibold flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <IndianRupee className="w-4 h-4" />
                {earnings.totalEarned.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] p-4">
              <div className="text-xs text-slate-500">Active Rentals Pending Payout</div>
              <div className="mt-1 text-xl font-semibold">
                ₹{earnings.pendingEarnings.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] p-4">
              <div className="text-xs text-slate-500">Deposits Held on Active Items</div>
              <div className="mt-1 text-xl font-semibold">
                ₹{earnings.depositsHeld.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        )}

        {earnings && earnings.perItem.length > 0 && (
          <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-2">
            <span className="font-medium text-slate-700 dark:text-slate-300">Per item:</span>
            {earnings.perItem.slice(0, 4).map((p) => (
              <span
                key={p.listingId}
                className="rounded-lg border border-slate-200 dark:border-slate-800 px-2.5 py-1"
              >
                {p.listingTitle.slice(0, 28)} · ₹{p.earnedAmount.toLocaleString('en-IN')} earned
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => switchTab('listings')}
          className={`pb-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors tabular-nums ${
            tab === 'listings'
              ? 'border-[#e63f24] text-[#e63f24]'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
          }`}
        >
          My Listings ({myListings.length})
        </button>
        <button
          type="button"
          onClick={() => switchTab('received')}
          className={`pb-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors tabular-nums ${
            tab === 'received'
              ? 'border-[#e63f24] text-[#e63f24]'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
          }`}
        >
          Requests Received ({receivedRequests.length})
          {pendingIncomingCount > 0 ? ` · ${pendingIncomingCount} pending` : ''}
        </button>
        <button
          type="button"
          onClick={() => switchTab('rentals')}
          className={`pb-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors tabular-nums ${
            tab === 'rentals'
              ? 'border-[#e63f24] text-[#e63f24]'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
          }`}
        >
          My Rentals ({myRentals.length})
        </button>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800/70"
            />
          ))}
        </div>
      ) : tab === 'listings' ? (
        myListings.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-10 text-center">
            <h2 className="text-lg font-medium text-slate-950 dark:text-white">
              You haven&apos;t listed any items yet
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Got a tripod, blazer, scientific calculator, or cycle sitting idle in your hostel room?
            </p>
            <Link
              to="/listings/new"
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#e63f24] text-white text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>List Your First Item</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {myListings.map((item) => {
              const rentedToday = listingsService.isRentedTodaySync(item.id);
              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <Link
                      to={`/listing/${item.id}`}
                      className="w-20 h-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 shrink-0"
                    >
                      <img
                        src={item.photos[0]}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </Link>
                    <div className="min-w-0">
                      <Link
                        to={`/listing/${item.id}`}
                        className="text-base font-medium text-slate-950 dark:text-white hover:text-[#e63f24] truncate block"
                      >
                        {item.title}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        <span>₹{item.pricePerDay}/day</span>
                        <span aria-hidden="true">·</span>
                        <span>₹{item.deposit} deposit</span>
                        <span aria-hidden="true">·</span>
                        <span>{item.college}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            item.isHiddenByModeration
                              ? 'text-[#e63f24] font-medium'
                              : item.isPaused
                                ? 'text-slate-500'
                                : rentedToday
                                  ? 'text-[#e63f24] font-medium'
                                  : 'text-emerald-600 dark:text-emerald-400 font-medium'
                          }
                        >
                          {item.isHiddenByModeration
                            ? 'Hidden by Moderation'
                            : item.isPaused
                              ? 'Paused'
                              : rentedToday
                                ? 'Rented'
                                : 'Available'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Link
                      to={`/listings/${item.id}/edit`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-[#e63f24] transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleTogglePause(item.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-[#e63f24] transition-colors"
                    >
                      {item.isPaused ? (
                        <>
                          <PlayCircle className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Resume</span>
                        </>
                      ) : (
                        <>
                          <PauseCircle className="w-3.5 h-3.5 text-amber-500" />
                          <span>Pause</span>
                        </>
                      )}
                    </button>
                    {confirmDeleteId === item.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDeleteListing(item.id)}
                          className="px-3 py-2 rounded-xl bg-[#e63f24] text-white text-xs font-medium"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-2 text-xs text-slate-500"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(item.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-[#e63f24] hover:bg-[#e63f24]/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : tab === 'received' ? (
        receivedRequests.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-10 text-center">
            <h2 className="text-lg font-medium text-slate-950 dark:text-white">
              No incoming requests yet
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              When a classmate requests one of your listed items, you can accept or decline it here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {receivedRequests.map((req) => {
              const item = listingsMap[req.listingId];
              const renter = usersMap[req.renterId];
              const payment = paymentsByReq[req.id];
              const reviewed = hasUserReviewed(req.id);
              return (
                <div
                  key={req.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-5 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {item?.photos[0] && (
                        <Link
                          to={`/listing/${item.id}`}
                          className="w-16 h-14 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 shrink-0"
                        >
                          <img
                            src={item.photos[0]}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </Link>
                      )}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={`/listing/${req.listingId}`}
                            className="text-base font-medium text-slate-950 dark:text-white hover:text-[#e63f24]"
                          >
                            {item?.title ?? 'Listing removed'}
                          </Link>
                          <StatusText status={req.status} />
                          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            Deposit: {req.depositStatus}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                          Requested by{' '}
                          <Link
                            to={`/u/${req.renterId}`}
                            className="font-medium text-slate-900 dark:text-slate-200 hover:text-[#e63f24]"
                          >
                            {renter?.name ?? 'Student'}
                          </Link>{' '}
                          ({renter?.college ?? 'Campus'}) · {formatDisplayDate(req.startDate)} –{' '}
                          {formatDisplayDate(req.endDate)} ({req.days} day
                          {req.days === 1 ? '' : 's'})
                        </div>
                        {req.message && (
                          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#070a12] rounded-xl px-3.5 py-2 border border-slate-100 dark:border-slate-800">
                            &ldquo;{req.message}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-left sm:text-right shrink-0 tabular-nums">
                      <div className="text-base font-semibold text-slate-950 dark:text-white">
                        ₹{req.totalAmount.toLocaleString('en-IN')}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        incl. ₹{req.depositSnapshot.toLocaleString('en-IN')} deposit
                      </div>
                    </div>
                  </div>

                  {/* Action Toolbar */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenChat(req)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium hover:border-[#e63f24]"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </button>

                      {payment && (
                        <button
                          type="button"
                          onClick={() => setReceiptTarget({ payment, req })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium hover:border-[#e63f24]"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>
                      )}

                      {(req.status === 'Accepted' || req.status === 'Returned') && (
                        <>
                          <button
                            type="button"
                            onClick={() => setHandoverTarget({ req, stage: 'pickup' })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium hover:border-[#e63f24]"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>
                              Pickup {req.pickupChecklist ? '✓' : 'Checklist'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setHandoverTarget({ req, stage: 'return' })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium hover:border-[#e63f24]"
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span>
                              Return {req.returnChecklist ? '✓' : 'Checklist'}
                            </span>
                          </button>
                          {!req.disputeTicketId ? (
                            <button
                              type="button"
                              onClick={() => handleOpenDispute(req)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-amber-600 dark:text-amber-400 hover:border-amber-500"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Dispute</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                              Dispute #{req.disputeTicketId} open
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {req.status === 'Pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleRequestAction(req.id, 'Declined')}
                            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-[#e63f24] hover:text-[#e63f24] transition-colors"
                          >
                            Decline
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRequestAction(req.id, 'Accepted')}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#e63f24] hover:bg-[#cc3118] text-white text-xs font-medium transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Accept Request</span>
                          </button>
                        </>
                      )}

                      {req.status === 'Accepted' && (
                        <button
                          type="button"
                          onClick={() => setReturnTarget(req)}
                          className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-medium hover:opacity-90 transition-opacity"
                        >
                          Mark Item Returned
                        </button>
                      )}

                      {req.status === 'Returned' && !reviewed && (
                        <button
                          type="button"
                          onClick={() =>
                            setReviewTarget({
                              req,
                              targetName: renter?.firstName ?? 'Renter',
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#e63f24] text-white text-xs font-medium"
                        >
                          <Star className="w-3.5 h-3.5" />
                          <span>Review Renter</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {req.status === 'Accepted' && renter && (
                    <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 rounded-xl px-3.5 py-2.5">
                      <Phone className="w-3.5 h-3.5" />
                      <span>
                        Renter WhatsApp unlocked:{' '}
                        <strong className="tabular-nums">{renter.phone}</strong>
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : myRentals.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-10 text-center">
          <h2 className="text-lg font-medium text-slate-950 dark:text-white">
            No rental requests yet
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Browse cameras, projectors, cycles, or formal wear from classmates on campus.
          </p>
          <Link
            to="/browse"
            className="mt-5 inline-flex px-5 py-2.5 rounded-xl bg-[#e63f24] text-white text-sm font-medium"
          >
            Browse Rentals
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {myRentals.map((req) => {
            const item = listingsMap[req.listingId];
            const owner = usersMap[req.ownerId];
            const payment = paymentsByReq[req.id];
            const reviewed = hasUserReviewed(req.id);
            return (
              <div
                key={req.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-5 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {item?.photos[0] && (
                      <Link
                        to={`/listing/${item.id}`}
                        className="w-16 h-14 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 shrink-0"
                      >
                        <img
                          src={item.photos[0]}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </Link>
                    )}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/listing/${req.listingId}`}
                          className="text-base font-medium text-slate-950 dark:text-white hover:text-[#e63f24]"
                        >
                          {item?.title ?? 'Listing removed'}
                        </Link>
                        <StatusText status={req.status} />
                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          Deposit: {req.depositStatus}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                        Owner:{' '}
                        <Link to={`/u/${req.ownerId}`} className="hover:text-[#e63f24] font-medium">
                          {owner?.name ?? 'Student'}
                        </Link>{' '}
                        ({owner?.college ?? 'Campus'}) · {formatDisplayDate(req.startDate)} –{' '}
                        {formatDisplayDate(req.endDate)} ({req.days} day
                        {req.days === 1 ? '' : 's'})
                      </div>
                      {req.depositDeductionReason && (
                        <div className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                          Deduction ₹{req.depositDeductionAmount}: {req.depositDeductionReason}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0 tabular-nums">
                    <div className="text-base font-semibold text-slate-950 dark:text-white">
                      ₹{req.totalAmount.toLocaleString('en-IN')}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {req.creditsUsed > 0
                        ? `saved ₹${req.creditsUsed} credits`
                        : `incl. ₹${req.depositSnapshot.toLocaleString('en-IN')} deposit`}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenChat(req)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium hover:border-[#e63f24]"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat</span>
                    </button>

                    {payment && (
                      <button
                        type="button"
                        onClick={() => setReceiptTarget({ payment, req })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium hover:border-[#e63f24]"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Receipt</span>
                      </button>
                    )}

                    {(req.status === 'Accepted' || req.status === 'Returned') && (
                      <>
                        <button
                          type="button"
                          onClick={() => setHandoverTarget({ req, stage: 'pickup' })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium hover:border-[#e63f24]"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Pickup {req.pickupChecklist ? '✓' : 'Checklist'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setHandoverTarget({ req, stage: 'return' })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium hover:border-[#e63f24]"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>Return {req.returnChecklist ? '✓' : 'Checklist'}</span>
                        </button>
                        {!req.disputeTicketId ? (
                          <button
                            type="button"
                            onClick={() => handleOpenDispute(req)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-amber-600 dark:text-amber-400 hover:border-amber-500"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Dispute</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            Dispute #{req.disputeTicketId} open
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {(req.status === 'Pending' || req.status === 'Accepted') && (
                      <button
                        type="button"
                        onClick={() => handleRequestAction(req.id, 'Cancelled')}
                        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-[#e63f24] hover:text-[#e63f24] transition-colors"
                      >
                        Cancel Request ({req.cancellationPolicySnapshot})
                      </button>
                    )}

                    {req.status === 'Returned' && !reviewed && (
                      <button
                        type="button"
                        onClick={() =>
                          setReviewTarget({
                            req,
                            targetName: owner?.firstName ?? 'Owner',
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#e63f24] text-white text-xs font-medium"
                      >
                        <Star className="w-3.5 h-3.5" />
                        <span>Review Owner &amp; Item</span>
                      </button>
                    )}
                  </div>
                </div>

                {req.status === 'Accepted' && owner && (
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 text-sm text-emerald-950 dark:text-emerald-200">
                      <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>
                        Owner WhatsApp / Phone:{' '}
                        <strong className="font-semibold tabular-nums">{owner.phone}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyPhone(owner.phone)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#0b101d] border border-emerald-500/30 text-xs font-medium text-emerald-800 dark:text-emerald-200"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </button>
                      <a
                        href={`https://wa.me/${formatWaNumber(owner.phone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {handoverTarget && (
        <HandoverModal
          request={handoverTarget.req}
          listingTitle={listingsMap[handoverTarget.req.listingId]?.title ?? 'Campus Item'}
          stage={handoverTarget.stage}
          onClose={() => setHandoverTarget(null)}
          onSuccess={() => {
            setHandoverTarget(null);
            loadDashboard();
          }}
        />
      )}

      {returnTarget && (
        <ReturnSettleModal
          request={returnTarget}
          listingTitle={listingsMap[returnTarget.listingId]?.title ?? 'Campus Item'}
          onClose={() => setReturnTarget(null)}
          onSuccess={() => {
            setReturnTarget(null);
            refreshUsers();
            loadDashboard();
          }}
        />
      )}

      {reviewTarget && (
        <ReviewModal
          requestId={reviewTarget.req.id}
          targetName={reviewTarget.targetName}
          listingTitle={listingsMap[reviewTarget.req.listingId]?.title ?? 'Campus Item'}
          onClose={() => setReviewTarget(null)}
          onSuccess={() => {
            setReviewTarget(null);
            loadDashboard();
          }}
        />
      )}

      {receiptTarget && (
        <ReceiptModal
          payment={receiptTarget.payment}
          request={receiptTarget.req}
          listingTitle={listingsMap[receiptTarget.req.listingId]?.title ?? 'Campus Item'}
          onClose={() => setReceiptTarget(null)}
        />
      )}
    </main>
  );
}
