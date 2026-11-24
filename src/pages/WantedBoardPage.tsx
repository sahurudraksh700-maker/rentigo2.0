import { CheckCircle2, MapPin, Megaphone, Plus, Send } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CAMPUS_OPTIONS } from '../data/seedData';
import { discoveryService } from '../services/discoveryService';
import { listingsService } from '../services/listingsService';
import { usersService } from '../services/usersService';
import {
  LISTING_CATEGORIES,
  type Listing,
  type ListingCategory,
  type UserProfile,
  type WantedPost,
} from '../types/rentigo';
import { extractCampusName } from '../utils/badges';
import { formatDisplayDate, formatRelativeTime, todayIsoDate } from '../utils/dates';
import { usePageMeta } from '../utils/seo';

export function WantedBoardPage() {
  const { user, openSignIn } = useAuth();
  const { showToast } = useToast();

  usePageMeta({
    title: 'Wanted Board — Rentigo',
    description: 'Post items you need on campus and receive rental offers from classmates nearby.',
  });

  const [posts, setPosts] = useState<WantedPost[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, UserProfile>>({});
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ListingCategory>('Cameras');
  const [budget, setBudget] = useState('250');
  const [neededFrom, setNeededFrom] = useState(todayIsoDate());
  const [neededTo, setNeededTo] = useState(todayIsoDate());
  const [college, setCollege] = useState(
    user ? extractCampusName(user.college) : 'IIT Delhi',
  );
  const [details, setDetails] = useState('');

  const [replyOpenId, setReplyOpenId] = useState<string | null>(null);
  const [replyMsg, setReplyMsg] = useState('');
  const [replyPrice, setReplyPrice] = useState('');
  const [replyListingId, setReplyListingId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allPosts, allUsers, ownerItems] = await Promise.all([
        discoveryService.listWantedPosts(),
        usersService.listUsers(),
        user ? listingsService.listByOwner(user.id) : Promise.resolve([]),
      ]);
      const uMap: Record<string, UserProfile> = {};
      for (const u of allUsers) uMap[u.id] = u;
      setUsersMap(uMap);
      setPosts(allPosts);
      setMyListings(ownerItems);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreatePost = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      openSignIn('/wanted');
      return;
    }
    try {
      await discoveryService.createWantedPost({
        requesterId: user.id,
        title,
        category,
        budgetPerDay: Number(budget),
        neededFrom,
        neededTo,
        college,
        details,
      });
      setTitle('');
      setDetails('');
      setShowForm(false);
      showToast('Wanted request posted on campus!', 'success');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to post', 'error');
    }
  };

  const handleRespond = async (postId: string, e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      openSignIn('/wanted');
      return;
    }
    try {
      await discoveryService.addWantedResponse({
        postId,
        responderId: user.id,
        message: replyMsg,
        listingId: replyListingId || undefined,
        offeredPricePerDay: replyPrice ? Number(replyPrice) : undefined,
      });
      setReplyOpenId(null);
      setReplyMsg('');
      setReplyPrice('');
      setReplyListingId('');
      showToast('Offer sent to classmate!', 'success');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to respond', 'error');
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#e63f24]">
            Campus Demand Board
          </p>
          <h1 className="mt-1 text-3xl font-normal text-slate-950 dark:text-white">
            Wanted on Campus
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
            Can&apos;t find an item in the catalog? Post what you need and classmates who own it can reply with an offer.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!user) openSignIn('/wanted');
            else setShowForm((v) => !v);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#e63f24] hover:bg-[#cc3118] text-white text-sm font-medium shrink-0 self-start"
        >
          <Plus className="w-4 h-4" />
          <span>{showForm ? 'Close Form' : 'Post a Wanted Item'}</span>
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreatePost}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-6 space-y-4"
        >
          <h2 className="text-base font-medium">What do you need to rent?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Need DJI Gimbal or Tripod for Friday fest"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3.5 py-2.5 text-sm outline-none focus:border-[#e63f24]"
              required
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ListingCategory)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3.5 py-2.5 text-sm outline-none focus:border-[#e63f24]"
            >
              {LISTING_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Max Budget / day (₹)</label>
              <input
                type="number"
                min={20}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3 py-2 text-sm outline-none focus:border-[#e63f24]"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Campus</label>
              <select
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3 py-2 text-sm outline-none focus:border-[#e63f24]"
              >
                {CAMPUS_OPTIONS.filter((c) => c !== 'All Campuses').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">From</label>
              <input
                type="date"
                value={neededFrom}
                onChange={(e) => setNeededFrom(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3 py-2 text-sm outline-none focus:border-[#e63f24]"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Until</label>
              <input
                type="date"
                value={neededTo}
                min={neededFrom}
                onChange={(e) => setNeededTo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3 py-2 text-sm outline-none focus:border-[#e63f24]"
                required
              />
            </div>
          </div>
          <textarea
            rows={2}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Any specs, pickup preference, or usage notes..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3.5 py-2 text-sm outline-none focus:border-[#e63f24]"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs text-slate-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#e63f24] text-white text-xs font-medium"
            >
              Publish Wanted Request
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 rounded-2xl bg-slate-200 dark:bg-slate-800/70" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-12 text-center">
          <Megaphone className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h2 className="text-lg font-medium">No wanted posts yet</h2>
          <p className="mt-1 text-sm text-slate-500">
            Post what you need and let classmates lend it to you.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const requester = usersMap[post.requesterId];
            const isRequester = user?.id === post.requesterId;

            return (
              <div
                key={post.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-5 sm:p-6 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-medium">
                        {post.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          post.status === 'Fulfilled'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-[#e63f24]/15 text-[#e63f24]'
                        }`}
                      >
                        {post.status}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="w-3 h-3 text-[#e63f24]" />
                        {post.college}
                      </span>
                    </div>
                    <h2 className="mt-2 text-lg font-medium text-slate-950 dark:text-white">
                      {post.title}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Posted by{' '}
                      <Link to={`/u/${post.requesterId}`} className="font-medium hover:text-[#e63f24]">
                        {requester?.firstName ?? 'Student'}
                      </Link>{' '}
                      · Needed {formatDisplayDate(post.neededFrom)} – {formatDisplayDate(post.neededTo)} ·{' '}
                      {formatRelativeTime(post.createdAt)}
                    </p>
                    {post.details && (
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        {post.details}
                      </p>
                    )}
                  </div>

                  <div className="sm:text-right shrink-0 tabular-nums">
                    <div className="text-xs text-slate-500">Budget up to</div>
                    <div className="text-lg font-semibold text-slate-950 dark:text-white">
                      ₹{post.budgetPerDay}/day
                    </div>
                  </div>
                </div>

                {/* Responses */}
                {post.responses.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-xs font-medium text-slate-500">
                      Offers from classmates ({post.responses.length})
                    </div>
                    {post.responses.map((resp) => {
                      const responder = usersMap[resp.responderId];
                      return (
                        <div
                          key={resp.id}
                          className="rounded-xl bg-slate-50 dark:bg-[#070a12] border border-slate-100 dark:border-slate-800 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <Link
                              to={`/u/${resp.responderId}`}
                              className="font-semibold hover:text-[#e63f24]"
                            >
                              {responder?.name ?? 'Student'}
                            </Link>{' '}
                            <span className="text-slate-600 dark:text-slate-300">
                              — {resp.message}
                            </span>
                            {resp.offeredPricePerDay && (
                              <span className="ml-2 font-semibold text-emerald-600 dark:text-emerald-400">
                                (₹{resp.offeredPricePerDay}/day)
                              </span>
                            )}
                          </div>
                          {resp.listingId && (
                            <Link
                              to={`/listing/${resp.listingId}`}
                              className="font-medium text-[#e63f24] hover:underline shrink-0"
                            >
                              View listing →
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                  {isRequester && post.status === 'Open' && (
                    <button
                      type="button"
                      onClick={async () => {
                        await discoveryService.markWantedFulfilled(post.id, user.id);
                        showToast('Marked as fulfilled', 'success');
                        await load();
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-500/40 text-xs font-medium text-emerald-600 dark:text-emerald-400"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Fulfilled</span>
                    </button>
                  )}

                  {!isRequester && post.status === 'Open' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!user) openSignIn('/wanted');
                        else setReplyOpenId(replyOpenId === post.id ? null : post.id);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#e63f24] text-white text-xs font-medium"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Offer this item</span>
                    </button>
                  )}
                </div>

                {replyOpenId === post.id && (
                  <form
                    onSubmit={(e) => handleRespond(post.id, e)}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] p-4 space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <select
                        value={replyListingId}
                        onChange={(e) => setReplyListingId(e.target.value)}
                        className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101d] px-3 py-2 text-xs"
                      >
                        <option value="">Attach one of your listings (optional)</option>
                        {myListings.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.title} (₹{l.pricePerDay}/day)
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={10}
                        value={replyPrice}
                        onChange={(e) => setReplyPrice(e.target.value)}
                        placeholder="Offered ₹/day (optional)"
                        className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101d] px-3 py-2 text-xs"
                      />
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={replyMsg}
                        onChange={(e) => setReplyMsg(e.target.value)}
                        placeholder="Message your classmate..."
                        className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101d] px-3 py-2 text-xs"
                        required
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-[#e63f24] text-white text-xs font-medium"
                      >
                        Send Offer
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
