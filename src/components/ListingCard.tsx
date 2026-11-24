import { Heart, MapPin, Package, Star } from 'lucide-react';
import { useEffect, useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { listingsService } from '../services/listingsService';
import { reviewsService } from '../services/reviewsService';
import { wishlistService } from '../services/wishlistService';
import type { Listing, UserProfile } from '../types/rentigo';
import { formatPublicUserName } from '../utils/badges';
import { TrustBadges } from './TrustBadges';

interface ListingCardProps {
  listing: Listing;
  owner?: UserProfile | null;
  onWishlistChange?: () => void;
}

export function ListingCard({ listing, owner, onWishlistChange }: ListingCardProps) {
  const { user, openSignIn } = useAuth();
  const { showToast } = useToast();
  const [imgFailed, setImgFailed] = useState(false);
  const [saved, setSaved] = useState(() =>
    wishlistService.isWishlistedSync(user?.id, listing.id),
  );

  useEffect(() => {
    setSaved(wishlistService.isWishlistedSync(user?.id, listing.id));
  }, [user?.id, listing.id]);

  const rentedToday = listingsService.isRentedTodaySync(listing.id);
  const statusLabel = listing.isPaused
    ? 'Paused'
    : rentedToday
      ? 'Rented'
      : 'Available';

  const statusClasses = listing.isPaused
    ? 'bg-slate-900/80 text-slate-200 border-slate-700'
    : rentedToday
      ? 'bg-[#e63f24]/90 text-white border-[#e63f24]'
      : 'bg-emerald-950/85 text-emerald-200 border-emerald-700/60';

  const ratingSummary = reviewsService.getListingRatingSummarySync(listing.id);
  const displayRating =
    ratingSummary.count > 0 ? ratingSummary.average : owner?.rating ?? 5.0;
  const displayReviewCount =
    ratingSummary.count > 0 ? ratingSummary.count : owner?.reviewCount ?? 0;

  const handleToggleWishlist = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      openSignIn();
      return;
    }
    const next = !saved;
    setSaved(next); // optimistic UI
    try {
      const res = await wishlistService.toggle(user.id, listing.id);
      setSaved(res.saved);
      showToast(
        res.saved ? 'Saved to wishlist' : 'Removed from wishlist',
        res.saved ? 'success' : 'info',
      );
      onWishlistChange?.();
    } catch {
      setSaved(!next);
      showToast('Could not update wishlist', 'error');
    }
  };

  const primaryPhoto = listing.photos[0];

  return (
    <Link
      to={`/listing/${listing.id}`}
      className="group flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0b0f1b] overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-[#0f1524]">
        {primaryPhoto && !imgFailed ? (
          <img
            src={primaryPhoto}
            alt={listing.title}
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 px-4 text-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-[#101728] dark:to-[#080b14]">
            <Package className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-1">
              {listing.title}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={handleToggleWishlist}
          aria-label={saved ? `Remove ${listing.title} from wishlist` : `Save ${listing.title} to wishlist`}
          aria-pressed={saved}
          className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/55 hover:bg-black/75 backdrop-blur-sm text-white flex items-center justify-center transition-transform active:scale-95"
        >
          <Heart
            className={`w-4 h-4 ${saved ? 'fill-[#e63f24] text-[#e63f24]' : 'text-white'}`}
          />
        </button>

        <span
          className={`absolute top-3 right-3 px-2.5 py-1 rounded-md border text-[11px] font-medium tracking-wide backdrop-blur-sm ${statusClasses}`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          <h3 className="text-base font-medium text-slate-900 dark:text-[#eceff4] leading-snug line-clamp-2 group-hover:text-[#e63f24] transition-colors">
            {listing.title}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
            <span>{listing.category}</span>
            <span aria-hidden="true">·</span>
            <span>{listing.condition}</span>
            <span aria-hidden="true">·</span>
            <span>{formatPublicUserName(owner, user?.id)}</span>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
              <MapPin className="w-3 h-3 text-[#e63f24]" />
              <span>{listing.college}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{displayRating.toFixed(1)}</span>
              <span className="text-[11px] text-slate-400">({displayReviewCount})</span>
            </span>
          </div>

          {owner && (
            <div className="mt-2">
              <TrustBadges user={owner} compact max={2} />
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-baseline justify-between gap-2 tabular-nums">
          <div className="text-sm font-semibold text-slate-950 dark:text-white">
            ₹{listing.pricePerDay.toLocaleString('en-IN')}
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
              /day
            </span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            ₹{listing.deposit.toLocaleString('en-IN')} deposit
          </div>
        </div>
      </div>
    </Link>
  );
}
