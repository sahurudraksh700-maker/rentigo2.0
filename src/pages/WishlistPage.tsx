import { BellRing, Heart, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ListingCard } from '../components/ListingCard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { listingsService } from '../services/listingsService';
import { usersService } from '../services/usersService';
import { wishlistService } from '../services/wishlistService';
import type { Listing, UserProfile, WishlistItem } from '../types/rentigo';
import { usePageMeta } from '../utils/seo';

export function WishlistPage() {
  const { user, openSignIn } = useAuth();
  const { showToast } = useToast();

  usePageMeta({
    title: 'Saved Wishlist — Rentigo',
    description: 'View your saved campus rentals and get notified when rented items become available again.',
  });

  const [savedRows, setSavedRows] = useState<WishlistItem[]>([]);
  const [listingsMap, setListingsMap] = useState<Record<string, Listing>>({});
  const [ownersMap, setOwnersMap] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);

  const loadWishlist = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [rows, allListings, allUsers] = await Promise.all([
        wishlistService.listByUser(user.id),
        listingsService.listAll(),
        usersService.listUsers(),
      ]);
      const lMap: Record<string, Listing> = {};
      for (const l of allListings) lMap[l.id] = l;
      const uMap: Record<string, UserProfile> = {};
      for (const u of allUsers) uMap[u.id] = u;
      setSavedRows(rows);
      setListingsMap(lMap);
      setOwnersMap(uMap);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  if (!user) {
    return (
      <main className="max-w-xl mx-auto px-4 sm:px-6 py-16">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-8 text-center">
          <Heart className="w-8 h-8 text-[#e63f24] mx-auto mb-3" />
          <h1 className="text-2xl font-normal text-slate-950 dark:text-white">
            Your Campus Wishlist
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Sign in with Google to save cameras, blazers, or cycles and receive alerts when rented items become available again.
          </p>
          <button
            type="button"
            onClick={() => openSignIn('/wishlist')}
            className="mt-6 px-5 py-2.5 rounded-xl bg-[#e63f24] hover:bg-[#cc3118] text-white text-sm font-medium"
          >
            Sign in with Google
          </button>
        </div>
      </main>
    );
  }

  const handleRemove = async (listingId: string) => {
    await wishlistService.remove(user.id, listingId);
    showToast('Removed from wishlist', 'info');
    await loadWishlist();
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#e63f24]">
            Saved Items
          </p>
          <h1 className="mt-1 text-3xl font-normal tracking-tight text-slate-950 dark:text-white">
            Your Wishlist ({savedRows.length})
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <BellRing className="w-4 h-4 text-[#e63f24]" />
            <span>
              We notify you automatically when a rented or paused saved item becomes available again.
            </span>
          </p>
        </div>
        <Link
          to="/browse"
          className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-medium hover:border-[#e63f24] self-start"
        >
          Explore catalog
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-72 rounded-2xl bg-slate-200 dark:bg-slate-800/70"
            />
          ))}
        </div>
      ) : savedRows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-12 text-center max-w-lg mx-auto">
          <Heart className="w-9 h-9 text-slate-400 mx-auto mb-3" />
          <h2 className="text-lg font-medium text-slate-950 dark:text-white">
            No saved items yet
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Tap the heart icon on any listing card or item page to track its price and availability here.
          </p>
          <Link
            to="/browse"
            className="mt-6 inline-flex px-5 py-2.5 rounded-xl bg-[#e63f24] text-white text-sm font-medium"
          >
            Browse Campus Rentals
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {savedRows.map((row) => {
            const listing = listingsMap[row.listingId];
            if (!listing) {
              return (
                <div
                  key={row.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-5 flex flex-col justify-between gap-4"
                >
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-xs font-medium">
                      Unavailable
                    </span>
                    <p className="mt-2 text-sm text-slate-500">
                      This listing was removed or hidden by the owner.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(row.listingId)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-[#e63f24]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              );
            }

            return (
              <div key={row.id} className="flex flex-col gap-2">
                <ListingCard
                  listing={listing}
                  owner={ownersMap[listing.ownerId]}
                  onWishlistChange={loadWishlist}
                />
                <button
                  type="button"
                  onClick={() => handleRemove(listing.id)}
                  className="inline-flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-[#e63f24] hover:border-[#e63f24]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove from Wishlist</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
