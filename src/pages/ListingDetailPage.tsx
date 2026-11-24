import {
  ArrowLeft,
  Calendar,
  Clock,
  Copy,
  Flag,
  Heart,
  MapPin,
  MessageCircle,
  MessageSquare,
  Package,
  Pencil,
  QrCode,
  Share2,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AvailabilityCalendar } from '../components/AvailabilityCalendar';
import { ListingCard } from '../components/ListingCard';
import { QRCodeModal } from '../components/QRCodeModal';
import { ReportModal } from '../components/ReportModal';
import { RequestModal } from '../components/RequestModal';
import { TrustBadges } from '../components/TrustBadges';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { chatService } from '../services/chatService';
import { discoveryService } from '../services/discoveryService';
import { listingsService } from '../services/listingsService';
import { reviewsService } from '../services/reviewsService';
import { usersService } from '../services/usersService';
import { wishlistService } from '../services/wishlistService';
import type { Listing, ReportTargetType, Review, UserProfile } from '../types/rentigo';
import { formatPublicUserName } from '../utils/badges';
import { formatDisplayDate } from '../utils/dates';
import { usePageMeta } from '../utils/seo';

export function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, openSignIn } = useAuth();
  const { showToast } = useToast();

  const [listing, setListing] = useState<Listing | null>(null);
  const [owner, setOwner] = useState<UserProfile | null>(null);
  const [usersMap, setUsersMap] = useState<Record<string, UserProfile>>({});
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [similarItems, setSimilarItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [failedPhotos, setFailedPhotos] = useState<Record<number, boolean>>({});
  const [saved, setSaved] = useState(false);

  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    type: ReportTargetType;
    targetId: string;
    title: string;
  } | null>(null);
  const [justRequested, setJustRequested] = useState(false);

  const [replyOpenId, setReplyOpenId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [found, allUsers] = await Promise.all([
        listingsService.getById(id),
        usersService.listUsers(),
      ]);
      const uMap: Record<string, UserProfile> = {};
      for (const u of allUsers) uMap[u.id] = u;
      setUsersMap(uMap);
      setListing(found);
      setActivePhotoIdx(0);
      setFailedPhotos({});

      if (found) {
        await listingsService.incrementViewCount(found.id);
        discoveryService.trackRecentlyViewed(user?.id, found.id);
        setOwner(uMap[found.ownerId] ?? null);
        setBookedDates(listingsService.getBookedDatesSync(found.id));
        setSaved(wishlistService.isWishlistedSync(user?.id, found.id));
        const [itemReviews, similar] = await Promise.all([
          reviewsService.listForListing(found.id),
          discoveryService.listSimilarListings(found),
        ]);
        setReviews(itemReviews);
        setSimilarItems(similar);
      } else {
        setOwner(null);
        setBookedDates([]);
        setReviews([]);
        setSimilarItems([]);
      }
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const jsonLd = useMemo(() => {
    if (!listing) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: listing.title,
      description: listing.description,
      category: listing.category,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'INR',
        price: listing.pricePerDay,
        availability: listing.isPaused
          ? 'https://schema.org/OutOfStock'
          : 'https://schema.org/InStock',
      },
    };
  }, [listing]);

  usePageMeta({
    title: listing ? `${listing.title} — Rentigo` : 'Campus Rental — Rentigo',
    description: listing
      ? `Rent ${listing.title} for ₹${listing.pricePerDay}/day at ${listing.college}. ${listing.description.slice(0, 120)}`
      : undefined,
    image: listing?.photos[0],
    jsonLd,
  });

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
        <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-4">
            <div className="aspect-[4/3] rounded-2xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-36 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="lg:col-span-5 h-80 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </main>
    );
  }

  if (!listing) {
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-10">
          <h1 className="text-2xl font-medium text-slate-950 dark:text-white">
            Listing not found
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            This item may have been removed or hidden by campus moderation.
          </p>
          <Link
            to="/browse"
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#e63f24] text-white text-sm font-medium"
          >
            Back to Browse
          </Link>
        </div>
      </main>
    );
  }

  const isOwner = user?.id === listing.ownerId;
  const rentedToday = listingsService.isRentedTodaySync(listing.id);
  const statusLabel = listing.isPaused
    ? 'Paused'
    : rentedToday
      ? 'Rented today'
      : 'Available';

  const currentPhoto = listing.photos[activePhotoIdx];
  const currentPhotoFailed = failedPhotos[activePhotoIdx];
  const listingUrl = `${window.location.origin}/listing/${listing.id}`;

  const avgItemRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : (owner?.rating ?? 5.0).toFixed(1);

  const handleRequestClick = () => {
    if (!user) {
      openSignIn();
      return;
    }
    setRequestModalOpen(true);
  };

  const handleMessageOwner = async () => {
    if (!user) {
      openSignIn();
      return;
    }
    try {
      const conv = await chatService.getOrCreateConversation({
        listingId: listing.id,
        renterId: user.id,
        ownerId: listing.ownerId,
      });
      navigate(`/messages?conv=${encodeURIComponent(conv.id)}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to open chat', 'error');
    }
  };

  const handleWishlistToggle = async () => {
    if (!user) {
      openSignIn();
      return;
    }
    const optimistic = !saved;
    setSaved(optimistic);
    try {
      const res = await wishlistService.toggle(user.id, listing.id);
      setSaved(res.saved);
      showToast(
        res.saved ? 'Saved to wishlist' : 'Removed from wishlist',
        res.saved ? 'success' : 'info',
      );
    } catch {
      setSaved(!optimistic);
    }
  };

  const handleCopyShare = async () => {
    try {
      await navigator.clipboard.writeText(listingUrl);
      showToast('Listing link copied', 'success');
    } catch {
      showToast('Copy failed', 'error');
    }
  };

  const handleReplySubmit = async (reviewId: string, e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await reviewsService.replyToReview(reviewId, user.id, replyText);
      setReplyOpenId(null);
      setReplyText('');
      setReviews(await reviewsService.listForListing(listing.id));
      showToast('Reply posted', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to reply', 'error');
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-12">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Link
            to="/browse"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Browse</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleWishlistToggle}
              aria-pressed={saved}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                saved
                  ? 'border-[#e63f24] bg-[#e63f24]/10 text-[#e63f24]'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-[#e63f24]'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${saved ? 'fill-[#e63f24]' : ''}`} />
              <span>{saved ? 'Saved' : 'Save'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-[#e63f24]"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy link</span>
            </button>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Check out ${listing.title} on Rentigo: ${listingUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={() => setQrModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-[#e63f24]"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR Code</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setReportTarget({
                  type: 'listing',
                  targetId: listing.id,
                  title: listing.title,
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-[#e63f24] hover:border-[#e63f24]/40 transition-colors"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Report</span>
            </button>
          </div>
        </div>

        {justRequested && (
          <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-emerald-900 dark:text-emerald-200">
            <span>
              Request sent! Once {owner?.firstName ?? 'the owner'} accepts, their WhatsApp number unlocks in your dashboard.
            </span>
            <Link
              to="/dashboard?tab=rentals"
              className="font-semibold text-emerald-700 dark:text-emerald-300 underline whitespace-nowrap"
            >
              View My Rentals
            </Link>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8"
        >
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] overflow-hidden">
              <div className="relative aspect-[4/3] w-full bg-slate-100 dark:bg-[#0f1524]">
                {currentPhoto && !currentPhotoFailed ? (
                  <img
                    src={currentPhoto}
                    alt={`${listing.title} photo ${activePhotoIdx + 1}`}
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setFailedPhotos((prev) => ({ ...prev, [activePhotoIdx]: true }))
                    }
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Package className="w-10 h-10" />
                    <span className="text-sm">{listing.title}</span>
                  </div>
                )}
              </div>

              {listing.photos.length > 1 && (
                <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2.5 overflow-x-auto">
                  {listing.photos.map((photo, idx) => (
                    <button
                      key={`${photo}_${idx}`}
                      type="button"
                      onClick={() => setActivePhotoIdx(idx)}
                      className={`w-20 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                        idx === activePhotoIdx
                          ? 'border-[#e63f24]'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={photo}
                        alt={`Thumbnail ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-6 space-y-4">
              <h2 className="text-lg font-medium text-slate-950 dark:text-white">
                About this item
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {listing.description}
              </p>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <div className="text-slate-400">Category</div>
                  <div className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                    {listing.category}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Condition</div>
                  <div className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                    {listing.condition}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Campus</div>
                  <div className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                    {listing.college}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Pickup spot</div>
                  <div className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                    {listing.pickupLocation}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Late return fee</div>
                  <div className="mt-1 font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                    ₹{listing.lateFeePerDay}/day
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Cancellation</div>
                  <div className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                    {listing.cancellationPolicy}
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-slate-950 dark:text-white">
                  Availability calendar
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {formatDisplayDate(listing.availableFrom)} – {formatDisplayDate(listing.availableTo)}
                </span>
              </div>
              <AvailabilityCalendar
                availableFrom={listing.availableFrom}
                availableTo={listing.availableTo}
                bookedDates={bookedDates}
              />
            </section>

            {/* Reviews Section */}
            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-slate-950 dark:text-white flex items-center gap-2">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>Reviews ({reviews.length})</span>
                </h2>
                <span className="text-sm font-semibold tabular-nums">
                  {avgItemRating} ★
                </span>
              </div>

              {reviews.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No item reviews yet. Reviews unlock after a completed Returned rental.
                </p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((rev) => {
                    const reviewer = usersMap[rev.reviewerId];
                    return (
                      <div
                        key={rev.id}
                        className="rounded-xl border border-slate-100 dark:border-slate-800 p-4 space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/u/${rev.reviewerId}`}
                              className="text-sm font-medium hover:text-[#e63f24]"
                            >
                              {formatPublicUserName(reviewer, user?.id)}
                            </Link>
                            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-500">
                              <Star className="w-3.5 h-3.5 fill-amber-400" />
                              {rev.rating}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setReportTarget({
                                type: 'review',
                                targetId: rev.id,
                                title: `Review by ${reviewer?.firstName ?? 'Student'}`,
                              })
                            }
                            className="text-[11px] text-slate-400 hover:text-[#e63f24]"
                          >
                            Report review
                          </button>
                        </div>

                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {rev.comment}
                        </p>

                        {rev.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {rev.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {rev.ownerReply ? (
                          <div className="mt-2 rounded-lg bg-slate-50 dark:bg-[#070a12] border border-slate-100 dark:border-slate-800 p-3 text-xs">
                            <span className="font-semibold text-[#e63f24]">Owner reply: </span>
                            <span className="text-slate-700 dark:text-slate-300">
                              {rev.ownerReply.text}
                            </span>
                          </div>
                        ) : (
                          user?.id === rev.revieweeId && (
                            <div className="pt-1">
                              {replyOpenId === rev.id ? (
                                <form
                                  onSubmit={(e) => handleReplySubmit(rev.id, e)}
                                  className="flex gap-2"
                                >
                                  <input
                                    type="text"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Write one public reply..."
                                    className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3 py-1.5 text-xs outline-none focus:border-[#e63f24]"
                                    required
                                  />
                                  <button
                                    type="submit"
                                    className="px-3 py-1.5 rounded-lg bg-[#e63f24] text-white text-xs font-medium"
                                  >
                                    Post
                                  </button>
                                </form>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyOpenId(rev.id);
                                    setReplyText('');
                                  }}
                                  className="text-xs font-medium text-[#e63f24] hover:underline"
                                >
                                  Reply to review (1 reply allowed)
                                </button>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-24 space-y-5">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-6 space-y-5">
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      {listing.category} · {listing.college}
                    </span>
                    <span
                      className={`font-medium ${
                        listing.isPaused
                          ? 'text-slate-500'
                          : rentedToday
                            ? 'text-[#e63f24]'
                            : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <h1 className="mt-2 text-2xl sm:text-3xl font-normal tracking-tight text-slate-950 dark:text-[#eceff4]">
                    {listing.title}
                  </h1>
                </div>

                <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] p-4 flex items-baseline justify-between gap-4 tabular-nums">
                  <div>
                    <span className="text-3xl font-semibold text-slate-950 dark:text-white">
                      ₹{listing.pricePerDay.toLocaleString('en-IN')}
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      /day
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Refundable deposit
                    </div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      ₹{listing.deposit.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                  <MapPin className="w-4 h-4 text-[#e63f24] mt-0.5 shrink-0" />
                  <span>
                    Campus handover at{' '}
                    <strong className="font-medium text-slate-900 dark:text-white">
                      {listing.pickupLocation}
                    </strong>
                  </span>
                </div>

                {isOwner ? (
                  <div className="space-y-2.5 pt-1">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      You own this listing.
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Link
                        to={`/listings/${listing.id}/edit`}
                        className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-800 dark:text-slate-100 hover:border-[#e63f24] transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                        <span>Edit Listing</span>
                      </Link>
                      <Link
                        to="/dashboard?tab=received"
                        className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#e63f24] hover:bg-[#cc3118] text-white text-sm font-medium transition-colors"
                      >
                        <Calendar className="w-4 h-4" />
                        <span>Requests</span>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {listing.isPaused ? (
                      <button
                        type="button"
                        disabled
                        className="w-full py-3 px-5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm font-medium cursor-not-allowed"
                      >
                        Paused by Owner
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRequestClick}
                        className="w-full py-3.5 px-5 rounded-xl bg-[#e63f24] hover:bg-[#cc3118] text-white text-sm font-medium transition-colors shadow-sm"
                      >
                        {user ? 'Request to Rent' : 'Sign in with Google to Request'}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleMessageOwner}
                      className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-800 dark:text-slate-100 hover:border-[#e63f24] hover:text-[#e63f24] transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Message owner</span>
                    </button>
                  </div>
                )}

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Owner&apos;s WhatsApp unlocks only after your request is Accepted. Keep initial chat inside Rentigo.
                </p>
              </div>

              {/* Owner Card linking to Public Profile */}
              {owner && (
                <Link
                  to={`/u/${owner.id}`}
                  className="block rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-5 hover:border-[#e63f24]/60 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    {owner.photoUrl ? (
                      <img
                        src={owner.photoUrl}
                        alt={owner.name}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#e63f24]/15 text-[#e63f24] font-semibold flex items-center justify-center text-base shrink-0">
                        {owner.firstName.charAt(0)}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-950 dark:text-white truncate">
                        {formatPublicUserName(owner, user?.id)}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {owner.college}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="font-medium">{owner.rating.toFixed(1)}</span>
                          <span className="text-slate-400">({owner.reviewCount})</span>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <Clock className="w-3 h-3" />~{owner.avgResponseMinutes}m reply
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <TrustBadges user={owner} compact max={3} />
                    <span className="text-xs font-medium text-[#e63f24] shrink-0">
                      Profile →
                    </span>
                  </div>
                </Link>
              )}

              <Link
                to="/safety"
                className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0b0f1b] p-4 hover:border-[#e63f24]/50 transition-colors"
              >
                <ShieldCheck className="w-5 h-5 text-[#e63f24] mt-0.5 shrink-0" />
                <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  <span className="font-medium text-slate-900 dark:text-white">
                    Campus handover rules:
                  </span>{' '}
                  Meet on campus, inspect the item together, and take handover photos. Read full safety guide.
                </div>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Similar Items */}
      {similarItems.length > 0 && (
        <section className="pt-8 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-slate-950 dark:text-white">
              Similar campus items
            </h2>
            <Link
              to={`/browse?category=${encodeURIComponent(listing.category)}`}
              className="text-xs font-medium text-[#e63f24] hover:underline"
            >
              More in {listing.category} →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {similarItems.map((item) => (
              <ListingCard
                key={item.id}
                listing={item}
                owner={usersMap[item.ownerId]}
              />
            ))}
          </div>
        </section>
      )}

      {requestModalOpen && (
        <RequestModal
          listing={listing}
          bookedDates={bookedDates}
          onClose={() => setRequestModalOpen(false)}
          onSuccess={() => {
            setRequestModalOpen(false);
            setBookedDates(listingsService.getBookedDatesSync(listing.id));
            setJustRequested(true);
          }}
        />
      )}

      {qrModalOpen && (
        <QRCodeModal
          title={listing.title}
          url={listingUrl}
          onClose={() => setQrModalOpen(false)}
        />
      )}

      {reportTarget && (
        <ReportModal
          targetType={reportTarget.type}
          targetId={reportTarget.targetId}
          listingId={listing.id}
          listingTitle={reportTarget.title}
          onClose={() => setReportTarget(null)}
        />
      )}
    </main>
  );
}
