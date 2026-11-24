import {
  Bell,
  ChevronDown,
  Gift,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Plus,
  Settings,
  Shield,
  Sun,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useRealtimeCounts } from '../hooks/useRealtimeCounts';
import { notificationsService } from '../services/notificationsService';
import type { AppNotification } from '../types/rentigo';
import { formatRelativeTime } from '../utils/dates';

export function Navbar() {
  const { user, openSignIn, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { tr } = useLanguage();
  const navigate = useNavigate();
  const { unreadMessages, unreadNotifications, wishlistCount, refreshCounts } =
    useRealtimeCounts(user?.id);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [recentNotifs, setRecentNotifs] = useState<AppNotification[]>([]);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    if (!user || !notifOpen) return;
    notificationsService.listForUser(user.id).then((list) => {
      setRecentNotifs(list.slice(0, 6));
    });
  }, [notifOpen, user, unreadNotifications]);

  const handleListItem = () => {
    setMobileOpen(false);
    if (!user) {
      openSignIn('/listings/new');
      return;
    }
    navigate('/listings/new');
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await notificationsService.markAllRead(user.id);
    const updated = await notificationsService.listForUser(user.id);
    setRecentNotifs(updated.slice(0, 6));
    refreshCounts();
  };

  const handleOpenNotifItem = async (notif: AppNotification) => {
    if (!user) return;
    await notificationsService.markRead(notif.id, user.id);
    setNotifOpen(false);
    refreshCounts();
    navigate(notif.link || '/notifications');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `whitespace-nowrap shrink-0 text-sm font-medium transition-colors flex items-center gap-1.5 ${
      isActive
        ? 'text-[#e63f24]'
        : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800/80 bg-white/85 dark:bg-[#060810]/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link
          to="/"
          className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-slate-950 dark:text-[#eceff4] whitespace-nowrap shrink-0"
        >
          <img
            src="/assets/aistudio/Rentigo_Gradient_Circle_Logo_6bb3db80.png"
            alt="Rentigo official logo"
            className="w-8 h-8 rounded-full object-cover shrink-0"
          />
          <span>Rentigo</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-6" aria-label="Main navigation">
          <NavLink to="/browse" className={navLinkClass}>
            {tr('browse')}
          </NavLink>
          <NavLink to="/wanted" className={navLinkClass}>
            {tr('wanted')}
          </NavLink>
          <NavLink to="/wishlist" className={navLinkClass}>
            <Heart className="w-3.5 h-3.5" />
            <span>{tr('wishlist')}</span>
            {wishlistCount > 0 && (
              <span className="rounded-full bg-slate-200 dark:bg-slate-800 px-1.5 py-0.2 text-[11px] font-semibold">
                {wishlistCount}
              </span>
            )}
          </NavLink>
          <NavLink to="/messages" className={navLinkClass}>
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{tr('messages')}</span>
            {unreadMessages > 0 && (
              <span className="rounded-full bg-[#e63f24] text-white px-1.5 py-0.2 text-[11px] font-semibold">
                {unreadMessages}
              </span>
            )}
          </NavLink>
          <NavLink to="/dashboard" className={navLinkClass}>
            {tr('dashboard')}
          </NavLink>
          <button
            type="button"
            onClick={handleListItem}
            className="whitespace-nowrap shrink-0 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors"
          >
            {tr('listItem')}
          </button>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {user && (
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifOpen((v) => !v)}
                aria-label="Notifications"
                aria-expanded={notifOpen}
                className="relative p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-[#e63f24] transition-colors"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] rounded-full bg-[#e63f24] text-white text-[10px] font-semibold flex items-center justify-center px-1">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101d] shadow-2xl overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-sm font-medium">{tr('notifications')}</span>
                    {unreadNotifications > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-xs font-medium text-[#e63f24] hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                    {recentNotifs.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500">
                        You are all caught up.
                      </div>
                    ) : (
                      recentNotifs.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => handleOpenNotifItem(n)}
                          className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors ${
                            !n.isRead ? 'bg-[#e63f24]/5' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-900 dark:text-white">
                              {n.title}
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {formatRelativeTime(n.createdAt)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                            {n.body}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                  <Link
                    to="/notifications"
                    onClick={() => setNotifOpen(false)}
                    className="block text-center py-2.5 text-xs font-medium text-[#e63f24] border-t border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/60"
                  >
                    View all notifications
                  </Link>
                </div>
              )}
            </div>
          )}

          {user ? (
            <div className="relative hidden sm:block" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                aria-expanded={profileOpen}
                className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-sm font-medium text-slate-800 dark:text-slate-200 hover:border-[#e63f24] transition-colors whitespace-nowrap shrink-0"
              >
                <span className="w-6 h-6 rounded-full bg-[#e63f24] text-white text-xs font-semibold flex items-center justify-center">
                  {user.firstName.charAt(0)}
                </span>
                <span className="max-w-[96px] truncate">{user.firstName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101d] shadow-2xl overflow-hidden z-50 py-1.5 text-sm">
                  <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="font-medium truncate">{user.name}</div>
                    <div className="text-xs text-slate-500 truncate">{user.college}</div>
                    <div className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      Credits: ₹{(user.creditBalance || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <Link
                    to="/dashboard"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    <LayoutDashboard className="w-4 h-4 text-slate-400" />
                    <span>{tr('dashboard')}</span>
                  </Link>
                  <Link
                    to={`/u/${user.id}`}
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    <UserIcon className="w-4 h-4 text-slate-400" />
                    <span>Public Profile</span>
                  </Link>
                  <Link
                    to="/referrals"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    <Gift className="w-4 h-4 text-[#e63f24]" />
                    <span>{tr('referrals')} (₹50 bonus)</span>
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>{tr('settings')}</span>
                  </Link>
                  {user.role === 'admin' && (
                    <Link
                      to="/admin"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-amber-700 dark:text-amber-300 hover:bg-slate-50 dark:hover:bg-slate-900"
                    >
                      <Shield className="w-4 h-4" />
                      <span>{tr('admin')} Panel</span>
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      signOut();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-left text-[#e63f24] border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{tr('signOut')}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openSignIn()}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#e63f24] hover:bg-[#cc3118] text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0"
            >
              {tr('signInGoogle')}
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#060810] px-4 py-4 space-y-1.5">
          <Link
            to="/browse"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 rounded-xl text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            {tr('browse')}
          </Link>
          <Link
            to="/wanted"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 rounded-xl text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            {tr('wanted')} Board
          </Link>
          <Link
            to="/wishlist"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 rounded-xl text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            {tr('wishlist')} ({wishlistCount})
          </Link>
          <Link
            to="/messages"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 rounded-xl text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            {tr('messages')} {unreadMessages > 0 ? `(${unreadMessages})` : ''}
          </Link>
          <Link
            to="/referrals"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 rounded-xl text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            {tr('referrals')}
          </Link>
          <Link
            to="/safety"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 rounded-xl text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            {tr('safety')}
          </Link>
          <Link
            to="/settings"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 rounded-xl text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            {tr('settings')}
          </Link>
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-medium text-amber-600 dark:text-amber-300 hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              {tr('admin')} Panel
            </Link>
          )}
          <button
            type="button"
            onClick={handleListItem}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-900 text-left"
          >
            <Plus className="w-4 h-4" />
            <span>{tr('listItem')}</span>
          </button>
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            {user ? (
              <div className="flex items-center justify-between px-3 py-2">
                <Link
                  to={`/u/${user.id}`}
                  onClick={() => setMobileOpen(false)}
                  className="text-sm font-medium"
                >
                  {user.name}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    signOut();
                  }}
                  className="text-sm font-medium text-[#e63f24]"
                >
                  {tr('signOut')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  openSignIn();
                }}
                className="w-full py-2.5 rounded-xl bg-[#e63f24] text-white text-sm font-medium"
              >
                {tr('signInGoogle')}
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
