import { CheckCircle2, Copy, Gift, Share2 } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { referralsService, type ReferralStats } from '../services/referralsService';
import { usersService } from '../services/usersService';
import type { UserProfile } from '../types/rentigo';
import { formatRelativeTime } from '../utils/dates';
import { usePageMeta } from '../utils/seo';

export function ReferralsPage() {
  const { user, openSignIn, refreshUsers } = useAuth();
  const { showToast } = useToast();

  usePageMeta({
    title: 'Refer & Earn ₹50 Credits — Rentigo',
    description:
      'Invite classmates to Rentigo and earn ₹50 in rental credits each when they complete their first Returned rental.',
  });

  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [usersMap, setUsersMap] = useState<Record<string, UserProfile>>({});
  const [applyInput, setApplyInput] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [s, allUsers] = await Promise.all([
      referralsService.getStatsForUser(user.id),
      usersService.listUsers(),
    ]);
    const uMap: Record<string, UserProfile> = {};
    for (const u of allUsers) uMap[u.id] = u;
    setUsersMap(uMap);
    setStats(s);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) {
    return (
      <main className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-8">
          <Gift className="w-8 h-8 text-[#e63f24] mx-auto mb-3" />
          <h1 className="text-2xl font-normal">Invite classmates, earn ₹50 each</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Sign in to get your personal Rentigo referral link and track your ₹50 credit rewards.
          </p>
          <button
            type="button"
            onClick={() => openSignIn('/referrals')}
            className="mt-6 px-5 py-2.5 rounded-xl bg-[#e63f24] text-white text-sm font-medium"
          >
            Sign in with Google
          </button>
        </div>
      </main>
    );
  }

  const shareUrl = stats?.shareUrl ?? referralsService.buildShareUrl(user.referralCode);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Referral link copied!', 'success');
    } catch {
      showToast('Could not copy link', 'error');
    }
  };

  const handleApplyCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!applyInput.trim()) return;
    setBusy(true);
    try {
      await referralsService.applyReferralCode(user.id, applyInput);
      await refreshUsers();
      await load();
      setApplyInput('');
      showToast('Referral code applied! Complete your first rental to unlock ₹50.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to apply code', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#e63f24]">
          Campus Referrals
        </p>
        <h1 className="mt-1 text-3xl font-normal text-slate-950 dark:text-white">
          Give ₹50, Get ₹50
        </h1>
        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
          Share your Rentigo invite link with classmates. Once they complete their first Returned rental, both accounts earn ₹50 in Rentigo credits usable at checkout.
        </p>
      </div>

      {/* Share Card */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500">Your Referral Code</div>
            <div className="mt-1 text-2xl font-semibold tracking-wider text-[#e63f24]">
              {user.referralCode}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium hover:border-[#e63f24]"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Invite Link</span>
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Join me on Rentigo to rent cameras, blazers & cycles from classmates! Use my link (${user.referralCode}) to get ₹50 credit after your 1st rental: ${shareUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share on WhatsApp</span>
            </a>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3.5 py-2.5 text-xs text-slate-600 dark:text-slate-400 break-all">
          {shareUrl}
        </div>
      </section>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 tabular-nums">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-4">
            <div className="text-xs text-slate-500">Credit Balance</div>
            <div className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
              ₹{stats.creditBalance.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-4">
            <div className="text-xs text-slate-500">Friends Signed Up</div>
            <div className="mt-1 text-2xl font-semibold">{stats.invitedCount}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-4">
            <div className="text-xs text-slate-500">Completed 1st Rental</div>
            <div className="mt-1 text-2xl font-semibold">{stats.rewardedCount}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-4">
            <div className="text-xs text-slate-500">Total Referral Earned</div>
            <div className="mt-1 text-2xl font-semibold">
              ₹{stats.totalEarned.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      )}

      {/* Apply Referral Code if not already referred */}
      {!user.referredByUserId ? (
        <form
          onSubmit={handleApplyCode}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-5 flex flex-col sm:flex-row sm:items-center gap-3"
        >
          <div className="flex-1">
            <div className="text-sm font-medium">Have a classmate&apos;s referral code?</div>
            <div className="text-xs text-slate-500">
              Apply it before your first Returned rental to unlock ₹50 for both of you.
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={applyInput}
              onChange={(e) => setApplyInput(e.target.value.toUpperCase())}
              placeholder="e.g. AARAV50"
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3.5 py-2 text-sm uppercase outline-none focus:border-[#e63f24]"
            />
            <button
              type="submit"
              disabled={busy || !applyInput.trim()}
              className="px-4 py-2 rounded-xl bg-[#e63f24] text-white text-xs font-medium disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>
            Referred via code <strong>{user.referredByCode}</strong>. Self-referrals and duplicate codes are prevented automatically.
          </span>
        </div>
      )}

      {/* Rewards History Table */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 text-sm font-medium">
          Invited Classmates &amp; Credit History
        </div>
        {!stats || (stats.records.length === 0 && stats.transactions.length === 0) ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No referral activity yet. Share your link to earn your first ₹50 credit.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {stats.records.map((rec) => {
              const friend = usersMap[rec.refereeId];
              return (
                <div key={rec.id} className="px-6 py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium text-sm">
                      {friend?.name ?? 'Classmate'} joined via {rec.code}
                    </div>
                    <div className="text-slate-500">{formatRelativeTime(rec.createdAt)}</div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-md font-medium ${
                      rec.status === 'rewarded'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {rec.status === 'rewarded' ? `+₹${rec.rewardAmount} Rewarded` : 'Pending 1st Return'}
                  </span>
                </div>
              );
            })}
            {stats.transactions.map((tx) => (
              <div key={tx.id} className="px-6 py-3.5 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">{tx.description}</div>
                  <div className="text-slate-500">{formatRelativeTime(tx.createdAt)}</div>
                </div>
                <span
                  className={`font-semibold tabular-nums ${
                    tx.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600'
                  }`}
                >
                  {tx.amount >= 0 ? `+₹${tx.amount}` : `-₹${Math.abs(tx.amount)}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
