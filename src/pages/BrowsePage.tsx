import {
  AlertCircle,
  Bell,
  Bookmark,
  Clock,
  Flame,
  MapPin,
  Megaphone,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ListingCard } from '../components/ListingCard';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { CAMPUS_OPTIONS } from '../data/seedData';
import { discoveryService } from '../services/discoveryService';
import { listingsService } from '../services/listingsService';
import { usersService } from '../services/usersService';
import {
  LISTING_CATEGORIES,
  type Listing,
  type ListingCategory,
  type SavedSearch,
  type UserProfile,
} from '../types/rentigo';
import { usePageMeta } from '../utils/seo';

type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'rating-desc';
type PriceFilter = 'all' | 'under-150' | 'under-300' | 'under-600';
type AvailabilityFilter = 'all' | 'available-now';

export function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, openSignIn } = useAuth();
  const { tr } = useLanguage();
  const { showToast } = useToast();

  usePageMeta({
    title: 'Browse Campus Rentals — Rentigo',
    description:
      'Browse cameras, projectors, formal wear, cycles, books, and electronics from verified students on your campus.',
  });

  const urlCategory = searchParams.get('category') ?? 'All';
  const showReportGuide = searchParams.get('report') === '1';

  const [listings, setListings] = useState<Listing[]>([]);
  const [trending, setTrending] = useState<Listing[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Listing[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [ownersMap, setOwnersMap] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedCampus, setSelectedCampus] = useState<string>('All Campuses');
  const [selectedCategory, setSelectedCategory] = useState<string>(
    LISTING_CATEGORIES.includes(urlCategory as ListingCategory) ? urlCategory : 'All',
  );
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  useEffect(() => {
    const paramCat = searchParams.get('category') ?? 'All';
    if (
      paramCat === 'All' ||
      LISTING_CATEGORIES.includes(paramCat as ListingCategory)
    ) {
      setSelectedCategory(paramCat);
    }
  }, [searchParams]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allListings, allUsers, trendList, recentList, savedList] = await Promise.all([
        listingsService.listAll(),
        usersService.listUsers(),
        discoveryService.listTrendingListings(selectedCampus),
        discoveryService.listRecentlyViewed(user?.id),
        user ? discoveryService.listSavedSearches(user.id) : Promise.resolve([]),
      ]);
      const map: Record<string, UserProfile> = {};
      for (const u of allUsers) map[u.id] = u;
      setOwnersMap(map);
      setListings(allListings);
      setTrending(trendList);
      setRecentlyViewed(recentList);
      setSavedSearches(savedList);
    } finally {
      setLoading(false);
    }
  }, [selectedCampus, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectCategory = (cat: string) => {
    setSelectedCategory(cat);
    const next = new URLSearchParams(searchParams);
    if (cat === 'All') {
      next.delete('category');
    } else {
      next.set('category', cat);
    }
    setSearchParams(next, { replace: true });
  };

  const dismissReportBanner = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('report');
    setSearchParams(next, { replace: true });
  };

  const resetAllFilters = () => {
    setSearch('');
    setSelectedCampus('All Campuses');
    setPriceFilter('all');
    setAvailabilityFilter('all');
    setSortBy('newest');
    handleSelectCategory('All');
  };

  const handleSaveCurrentSearch = async () => {
    if (!user) {
      openSignIn('/browse');
      return;
    }
    const labelParts = [
      search.trim(),
      selectedCategory !== 'All' ? selectedCategory : '',
      selectedCampus !== 'All Campuses' ? selectedCampus : '',
    ].filter(Boolean);
    const label = labelParts.join(' · ') || 'All Campus Gear';

    await discoveryService.createSavedSearch({
      userId: user.id,
      label,
      query: search.trim(),
      category: selectedCategory,
      college: selectedCampus,
      priceFilter,
      alertEnabled: true,
    });
    const next = await discoveryService.listSavedSearches(user.id);
    setSavedSearches(next);
    showToast(`Saved search "${label}" with new-listing alerts`, 'success');
  };

  const handleApplySavedSearch = (s: SavedSearch) => {
    setSearch(s.query);
    setSelectedCampus(s.college || 'All Campuses');
    handleSelectCategory(s.category || 'All');
    setPriceFilter((s.priceFilter as PriceFilter) || 'all');
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = listings.filter((item) => {
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
      if (
        selectedCampus !== 'All Campuses' &&
        !item.college.toLowerCase().includes(selectedCampus.toLowerCase())
      ) {
        return false;
      }
      if (priceFilter === 'under-150' && item.pricePerDay > 150) return false;
      if (priceFilter === 'under-300' && item.pricePerDay > 300) return false;
      if (priceFilter === 'under-600' && item.pricePerDay > 600) return false;
      if (availabilityFilter === 'available-now') {
        if (item.isPaused || listingsService.isRentedTodaySync(item.id)) return false;
      }
      if (q) {
        const owner = ownersMap[item.ownerId];
        const haystack = [
          item.title,
          item.description,
          item.category,
          item.pickupLocation,
          item.college,
          owner?.firstName ?? '',
          owner?.college ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'price-asc') return a.pricePerDay - b.pricePerDay;
      if (sortBy === 'price-desc') return b.pricePerDay - a.pricePerDay;
      if (sortBy === 'rating-desc') {
        const ra = ownersMap[a.ownerId]?.rating ?? 0;
        const rb = ownersMap[b.ownerId]?.rating ?? 0;
        return rb - ra;
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [
    availabilityFilter,
    listings,
    ownersMap,
    priceFilter,
    search,
    selectedCampus,
    selectedCategory,
    sortBy,
  ]);

  const hasActiveFilters =
    search.trim() !== '' ||
    selectedCampus !== 'All Campuses' ||
    selectedCategory !== 'All' ||
    priceFilter !== 'all' ||
    availabilityFilter !== 'all';

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#e63f24]">
            Rentigo Campus Marketplace
          </p>
          <h1 className="mt-1 text-3xl sm:text-4xl font-normal tracking-tight text-slate-950 dark:text-[#eceff4]">
            {tr('browseHeadline')}
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
            {tr('browseSub')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            to="/wanted"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 hover:border-[#e63f24] transition-colors"
          >
            <Megaphone className="w-4 h-4 text-[#e63f24]" />
            <span>Wanted Board</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              if (!user) {
                openSignIn('/listings/new');
                return;
              }
              navigate('/listings/new');
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#e63f24] hover:bg-[#cc3118] text-white text-sm font-medium transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>{tr('listItem')}</span>
          </button>
        </div>
      </div>

      {showReportGuide && (
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-[#e63f24]/30 bg-[#e63f24]/10 px-4 py-3.5 text-sm text-slate-900 dark:text-slate-100">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#e63f24] mt-0.5 shrink-0" />
            <span>
              Want to report a listing? Open any item below and click{' '}
              <strong>Report listing</strong> to flag misleading photos, unsafe gear, or suspicious pricing.
            </span>
          </div>
          <button
            type="button"
            onClick={dismissReportBanner}
            aria-label="Dismiss notice"
            className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search + Campus Selector + Sort + Secondary Filters */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0b0f1b] p-4 sm:p-5 space-y-4">
        <div className="flex flex-col xl:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cameras, blazer, cycle, Hostel 4, Sony..."
              aria-label="Search campus rentals"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-[#e63f24]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex items-center">
              <MapPin className="w-3.5 h-3.5 text-[#e63f24] absolute left-3 pointer-events-none" />
              <select
                value={selectedCampus}
                onChange={(e) => setSelectedCampus(e.target.value)}
                aria-label="Filter by campus"
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] pl-8 pr-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-[#e63f24]"
              >
                {CAMPUS_OPTIONS.map((campus) => (
                  <option key={campus} value={campus}>
                    {campus}
                  </option>
                ))}
              </select>
            </div>

            <div className="hidden sm:flex items-center text-xs text-slate-500">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </div>

            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value as PriceFilter)}
              aria-label="Filter by daily price"
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-[#e63f24]"
            >
              <option value="all">Any daily rate</option>
              <option value="under-150">Up to ₹150/day</option>
              <option value="under-300">Up to ₹300/day</option>
              <option value="under-600">Up to ₹600/day</option>
            </select>

            <select
              value={availabilityFilter}
              onChange={(e) =>
                setAvailabilityFilter(e.target.value as AvailabilityFilter)
              }
              aria-label="Filter by availability"
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-[#e63f24]"
            >
              <option value="all">All statuses</option>
              <option value="available-now">Available today</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Sort listings"
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-[#e63f24]"
            >
              <option value="newest">Newest first</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating-desc">Top rated owners</option>
            </select>

            <button
              type="button"
              onClick={handleSaveCurrentSearch}
              title="Save this search & get alerts"
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-[#e63f24] hover:text-[#e63f24] transition-colors"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Save search</span>
            </button>
          </div>
        </div>

        {/* Category Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(['All', ...LISTING_CATEGORIES] as const).map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleSelectCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 border transition-colors ${
                  active
                    ? 'bg-[#e63f24] border-[#e63f24] text-white'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Saved Searches Bar */}
        {savedSearches.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">{tr('savedSearches')}:</span>
            {savedSearches.map((s) => (
              <div
                key={s.id}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-2.5 py-1"
              >
                <button
                  type="button"
                  onClick={() => handleApplySavedSearch(s)}
                  className="font-medium hover:text-[#e63f24]"
                >
                  {s.label}
                </button>
                <button
                  type="button"
                  aria-label={s.alertEnabled ? 'Mute search alert' : 'Enable search alert'}
                  onClick={async () => {
                    if (!user) return;
                    await discoveryService.toggleSavedSearchAlert(s.id, user.id);
                    setSavedSearches(await discoveryService.listSavedSearches(user.id));
                  }}
                  className={`p-0.5 ${s.alertEnabled ? 'text-[#e63f24]' : 'text-slate-400'}`}
                >
                  <Bell className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  aria-label={`Delete saved search ${s.label}`}
                  onClick={async () => {
                    if (!user) return;
                    await discoveryService.deleteSavedSearch(s.id, user.id);
                    setSavedSearches(await discoveryService.listSavedSearches(user.id));
                  }}
                  className="p-0.5 text-slate-400 hover:text-[#e63f24]"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Trending Strip (when browsing unfiltered or campus-filtered) */}
      {!loading && trending.length > 0 && search.trim() === '' && selectedCategory === 'All' && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium text-slate-950 dark:text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#e63f24]" />
              <span>{tr('trendingCampus')}</span>
            </h2>
            <span className="text-xs text-slate-500">{selectedCampus}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {trending.map((item) => (
              <ListingCard
                key={`trend_${item.id}`}
                listing={item}
                owner={ownersMap[item.ownerId]}
              />
            ))}
          </div>
        </section>
      )}

      {/* Main Catalog Results Header */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          <span>
            {loading
              ? 'Loading campus gear...'
              : `${filtered.length} ${filtered.length === 1 ? 'listing' : 'listings'} shown`}
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1.5 font-medium text-[#e63f24] hover:underline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset filters</span>
            </button>
          )}
        </div>

        {/* Grid / Loading Skeleton / Empty State */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] overflow-hidden animate-pulse"
              >
                <div className="aspect-[4/3] bg-slate-200 dark:bg-slate-800/70" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-20" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] px-6 py-14 text-center max-w-lg mx-auto">
            <h2 className="text-lg font-medium text-slate-900 dark:text-white">
              No matching campus gear found
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Clear a filter, or post on the Wanted Board so classmates with that item can offer it.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-800 dark:text-slate-200 hover:border-[#e63f24] transition-colors"
              >
                Clear filters
              </button>
              <Link
                to="/wanted"
                className="px-4 py-2 rounded-xl bg-[#e63f24] text-white text-sm font-medium"
              >
                Post on Wanted Board
              </Link>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          >
            {filtered.map((item) => (
              <ListingCard
                key={item.id}
                listing={item}
                owner={ownersMap[item.ownerId]}
              />
            ))}
          </motion.div>
        )}
      </section>

      {/* Recently Viewed Strip */}
      {recentlyViewed.length > 0 && (
        <section className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <h2 className="text-base font-medium text-slate-950 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#e63f24]" />
            <span>{tr('recentlyViewed')}</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {recentlyViewed.slice(0, 4).map((item) => (
              <ListingCard
                key={`rec_${item.id}`}
                listing={item}
                owner={ownersMap[item.ownerId]}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
