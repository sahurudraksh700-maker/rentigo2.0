import { Ban, Calendar, Clock, Flag, Star } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ListingCard } from '../components/ListingCard';
import { ReportModal } from '../components/ReportModal';
import { TrustBadges } from '../components/TrustBadges';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { listingsService } from '../services/listingsService';
import { moderationService } from '../services/moderationService';
import { reviewsService } from '../services/reviewsService';
import { usersService } from '../services/usersService';
import type { Listing, Review, UserProfile } from '../types/rentigo';
import { formatPublicUserName } from '../utils/badges';
import { formatMemberSince } from '../utils/dates';
import { usePageMeta } from '../utils/seo';

export function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user, openSignIn } = useAuth();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [foundUser, allUsers, ownerListings, userReviews] = await Promise.all([
        usersService.getById(id),
        usersService.listUsers(),
        listingsService.listByOwner(id),
        reviewsService.listForUser(id),
      ]);
      const uMap: Record<string, UserProfile> = {};
      for (const u of allUsers) uMap[u.id] = u;
      setUsersMap(uMap);
      setProfile(foundUser);
      setListings(ownerListings.filter((l) => !l.isHiddenByModeration));
      setReviews(userReviews);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  usePageMeta({
    title: profile ? `${formatPublicUserName(profile, user?.id)} — Rentigo` : 'Student Profile — Rentigo',
  });

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-12 animate-pulse space-y-6">
        <div className="h-36 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-10">
          <h1 className="text-xl font-medium">Student profile not found</h1>
          <Link
            to="/browse"
            className="mt-5 inline-flex px-5 py-2.5 rounded-xl bg-[#e63f24] text-white text-sm font-medium"
          >
            Back to Browse
          </Link>
        </div>
      </main>
    );
  }

  const isSelf = user?.id === profile.id;
  const iBlocked = user ? moderationService.didUserBlockSync(user.id, profile.id) : false;

  const handleToggleBlock = async () => {
    if (!user) {
      openSignIn();
      return;
    }
    if (iBlocked) {
      await moderationService.unblockUser(user.id, profile.id);
      showToast(`Unblocked ${profile.firstName}`, 'info');
    } else {
      await moderationService.blockUser(user.id, profile.id);
      showToast(`Blocked ${profile.firstName}`, 'info');
    }
    await loadProfile();
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-[#e63f24] text-white text-2xl font-semibold flex items-center justify-center shrink-0">
            {profile.firstName.charAt(0)}
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-normal text-slate-950 dark:text-white">
              {formatPublicUserName(profile, user?.id)}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">{profile.college}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              <span className="inline-flex items-center gap-1 text-slate-800 dark:text-slate-200 font-medium">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {profile.rating.toFixed(1)} ({profile.reviewCount} reviews)
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Member since {formatMemberSince(profile.joinedAt)}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                ~{profile.avgResponseMinutes}m response
              </span>
              <span>·</span>
              <span>{profile.completedRentalsCount} completed rentals</span>
            </div>
            <TrustBadges user={profile} />
          </div>
        </div>

        {!isSelf && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (!user) openSignIn();
                else setReportOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium hover:border-[#e63f24] hover:text-[#e63f24]"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Report User</span>
            </button>
            <button
              type="button"
              onClick={handleToggleBlock}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium hover:border-[#e63f24] hover:text-[#e63f24]"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>{iBlocked ? 'Unblock' : 'Block'}</span>
            </button>
          </div>
        )}
      </section>

      {/* Listings */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-slate-950 dark:text-white">
          Items listed by {profile.firstName} ({listings.length})
        </h2>
        {listings.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-8 text-center text-sm text-slate-500">
            No active campus listings right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {listings.map((item) => (
              <ListingCard key={item.id} listing={item} owner={profile} />
            ))}
          </div>
        )}
      </section>

      {/* Reviews */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-slate-950 dark:text-white">
          Reviews for {profile.firstName} ({reviews.length})
        </h2>
        {reviews.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-8 text-center text-sm text-slate-500">
            No reviews yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((rev) => {
              const reviewer = usersMap[rev.reviewerId];
              return (
                <div
                  key={rev.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-5 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      to={`/u/${rev.reviewerId}`}
                      className="text-sm font-medium hover:text-[#e63f24]"
                    >
                      {formatPublicUserName(reviewer, user?.id)}
                    </Link>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      {rev.rating}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{rev.comment}</p>
                  {rev.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {rev.tags.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {rev.ownerReply && (
                    <div className="rounded-xl bg-slate-50 dark:bg-[#070a12] p-3 text-xs">
                      <span className="font-semibold text-[#e63f24]">Reply: </span>
                      <span>{rev.ownerReply.text}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {reportOpen && (
        <ReportModal
          targetType="user"
          targetId={profile.id}
          targetUserId={profile.id}
          listingTitle={profile.name}
          onClose={() => setReportOpen(false)}
        />
      )}
    </main>
  );
}
