import { Bell, CheckCheck, Settings } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRealtimeCounts } from '../hooks/useRealtimeCounts';
import { notificationsService } from '../services/notificationsService';
import type { AppNotification } from '../types/rentigo';
import { formatRelativeTime } from '../utils/dates';
import { usePageMeta } from '../utils/seo';

export function NotificationsPage() {
  const { user, openSignIn } = useAuth();
  const navigate = useNavigate();
  const { refreshCounts } = useRealtimeCounts(user?.id);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  usePageMeta({ title: 'Notifications — Rentigo' });

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      await notificationsService.checkReturnRemindersForUser(user.id);
      setItems(await notificationsService.listForUser(user.id));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) {
    return (
      <main className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-8">
          <Bell className="w-8 h-8 text-[#e63f24] mx-auto mb-3" />
          <h1 className="text-2xl font-normal">Notifications</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Sign in to view rental updates, chat alerts, return reminders, and referral credits.
          </p>
          <button
            type="button"
            onClick={() => openSignIn('/notifications')}
            className="mt-6 px-5 py-2.5 rounded-xl bg-[#e63f24] text-white text-sm font-medium"
          >
            Sign in with Google
          </button>
        </div>
      </main>
    );
  }

  const unreadCount = items.filter((i) => !i.isRead).length;

  const handleMarkAll = async () => {
    await notificationsService.markAllRead(user.id);
    await load();
    refreshCounts();
  };

  const handleOpen = async (n: AppNotification) => {
    await notificationsService.markRead(n.id, user.id);
    refreshCounts();
    navigate(n.link || '/dashboard');
  };

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-normal text-slate-950 dark:text-white">
            Notifications {unreadCount > 0 ? `(${unreadCount} unread)` : ''}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Requests, messages, reviews, return reminders, wishlist alerts, and referrals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium hover:border-[#e63f24]"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
          <Link
            to="/settings?tab=notifications"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium hover:border-[#e63f24]"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Preferences</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-slate-200 dark:bg-slate-800/70" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-12 text-center">
          <Bell className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h2 className="text-lg font-medium">You are all caught up</h2>
          <p className="mt-1 text-sm text-slate-500">
            New rental requests, replies, and wishlist availability alerts will show up here.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => handleOpen(n)}
              className={`w-full text-left p-4 sm:p-5 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors flex items-start justify-between gap-4 ${
                !n.isRead ? 'bg-[#e63f24]/5' : ''
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-[#e63f24] shrink-0" />
                  )}
                  <span className="text-sm font-medium text-slate-950 dark:text-white">
                    {n.title}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  {n.body}
                </p>
              </div>
              <span className="text-[11px] text-slate-400 shrink-0 whitespace-nowrap">
                {formatRelativeTime(n.createdAt)}
              </span>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
