import {
  BadgeCheck,
  Bell,
  Download,
  Globe,
  Lock,
  ShieldAlert,
  Trash2,
  Upload,
  User as UserIcon,
} from 'lucide-react';
import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TrustBadges } from '../components/TrustBadges';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { moderationService } from '../services/moderationService';
import { usersService } from '../services/usersService';
import { verificationsService } from '../services/verificationsService';
import type {
  NotificationSettingsMap,
  NotificationType,
  UserProfile,
  VerificationRequest,
} from '../types/rentigo';
import { usePageMeta } from '../utils/seo';

type SettingsTab = 'profile' | 'verify' | 'notifications' | 'privacy';

const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  request_new: 'New incoming rental requests',
  request_accepted: 'Rental request accepted',
  request_declined: 'Rental request declined',
  request_cancelled: 'Rental cancelled',
  request_returned: 'Item marked returned & deposit settled',
  message_new: 'New chat messages',
  review_received: 'New reviews received',
  wishlist_available: 'Saved item / search availability alerts',
  referral_reward: '₹50 referral reward credited',
  return_reminder: '1-day-before return reminders',
};

export function SettingsPage() {
  const { user, openSignIn, updateProfile, deleteAccount, refreshUsers } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  usePageMeta({ title: 'Account Settings & Verification — Rentigo' });

  const initialTab = (searchParams.get('tab') as SettingsTab) || 'profile';
  const [tab, setTab] = useState<SettingsTab>(
    ['profile', 'verify', 'notifications', 'privacy'].includes(initialTab)
      ? initialTab
      : 'profile',
  );

  // Profile fields
  const [name, setName] = useState('');
  const [college, setCollege] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  // Verification fields
  const [collegeEmail, setCollegeEmail] = useState('');
  const [demoOtpHint, setDemoOtpHint] = useState<string | null>(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [studentIdNumber, setStudentIdNumber] = useState('');
  const [idPhotoData, setIdPhotoData] = useState('');
  const [verHistory, setVerHistory] = useState<VerificationRequest[]>([]);

  // Blocked users
  const [blockedUsers, setBlockedUsers] = useState<UserProfile[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadExtras = useCallback(async () => {
    if (!user) return;
    const [vers, blockedIds, allUsers] = await Promise.all([
      verificationsService.listForUser(user.id),
      moderationService.listBlockedUsersFor(user.id),
      usersService.listUsers(),
    ]);
    setVerHistory(vers);
    const uMap = new Map(allUsers.map((u) => [u.id, u]));
    setBlockedUsers(
      blockedIds.map((id) => uMap.get(id)).filter((u): u is UserProfile => Boolean(u)),
    );
  }, [user]);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setCollege(user.college);
      setPhone(user.phone);
      setCollegeEmail(user.verifiedCollegeEmail || user.email);
      loadExtras();
    }
  }, [loadExtras, user]);

  useEffect(() => {
    const param = searchParams.get('tab') as SettingsTab | null;
    if (param && ['profile', 'verify', 'notifications', 'privacy'].includes(param)) {
      setTab(param);
    }
  }, [searchParams]);

  const switchTab = (next: SettingsTab) => {
    setTab(next);
    const params = new URLSearchParams(searchParams);
    params.set('tab', next);
    setSearchParams(params, { replace: true });
  };

  if (!user) {
    return (
      <main className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-8">
          <h1 className="text-2xl font-normal">Account Settings</h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to edit your profile, verify your student ID, or manage privacy and alerts.
          </p>
          <button
            type="button"
            onClick={() => openSignIn('/settings')}
            className="mt-6 px-5 py-2.5 rounded-xl bg-[#e63f24] text-white text-sm font-medium"
          >
            Sign in with Google
          </button>
        </div>
      </main>
    );
  }

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ name, college, phone, language });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSendOtp = async () => {
    try {
      const res = await verificationsService.requestEmailOtp(user.id, collegeEmail);
      setDemoOtpHint(res.demoCode);
      showToast(`Verification OTP ready for ${res.email}`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Invalid college email', 'error');
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await verificationsService.verifyEmailOtp(user.id, enteredOtp);
      setDemoOtpHint(null);
      setEnteredOtp('');
      await refreshUsers();
      await loadExtras();
      showToast('Verified student badge unlocked!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'OTP verification failed', 'error');
    }
  };

  const handleIdPhotoPick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setIdPhotoData(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleIdSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await verificationsService.submitIdPhotoVerification(
        user.id,
        idPhotoData,
        studentIdNumber,
      );
      setIdPhotoData('');
      setStudentIdNumber('');
      await refreshUsers();
      await loadExtras();
      showToast('Student ID submitted for review in /admin', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Submission failed', 'error');
    }
  };

  const handleToggleNotification = async (key: NotificationType) => {
    const nextMap: NotificationSettingsMap = {
      ...user.notificationSettings,
      [key]: !user.notificationSettings[key],
    };
    await updateProfile({ notificationSettings: nextMap });
  };

  const handleExportData = () => {
    const payload = usersService.exportUserDataSync(user.id);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rentigo-export-${user.firstName.toLowerCase()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Exported your Rentigo JSON archive', 'success');
  };

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-normal text-slate-950 dark:text-white">
          Settings &amp; Verification
        </h1>
        <div className="mt-2">
          <TrustBadges user={user} />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-6 overflow-x-auto">
        {(
          [
            { id: 'profile', label: 'Profile & Language', Icon: UserIcon },
            { id: 'verify', label: 'Student Verification', Icon: BadgeCheck },
            { id: 'notifications', label: 'Notifications', Icon: Bell },
            { id: 'privacy', label: 'Privacy & Account', Icon: Lock },
          ] as const
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => switchTab(id)}
            className={`pb-3 text-sm font-medium border-b-2 whitespace-nowrap inline-flex items-center gap-1.5 transition-colors ${
              tab === id
                ? 'border-[#e63f24] text-[#e63f24]'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <form
          onSubmit={handleSaveProfile}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-6 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3.5 py-2.5 text-sm outline-none focus:border-[#e63f24]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                College &amp; Hostel
              </label>
              <input
                type="text"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3.5 py-2.5 text-sm outline-none focus:border-[#e63f24]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                WhatsApp / Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3.5 py-2.5 text-sm outline-none focus:border-[#e63f24]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />
                <span>App Language</span>
              </label>
              <select
                value={language}
                onChange={(e) => {
                  const next = e.target.value === 'hi' ? 'hi' : 'en';
                  setLanguage(next);
                  updateProfile({ language: next });
                }}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3.5 py-2.5 text-sm outline-none focus:border-[#e63f24]"
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी (Hindi)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-[#e63f24] hover:bg-[#cc3118] text-white text-sm font-medium"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      )}

      {tab === 'verify' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-medium">Verification Status</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Status:{' '}
                  <strong className="uppercase text-[#e63f24]">{user.verificationStatus}</strong>
                  {user.verifiedCollegeEmail ? ` (${user.verifiedCollegeEmail})` : ''}
                </p>
              </div>
              {user.isVerified && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                  <BadgeCheck className="w-4 h-4" />
                  Verified Student
                </span>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <h3 className="text-sm font-medium">Method 1: Instant .edu / .ac.in Email OTP</h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={collegeEmail}
                  onChange={(e) => setCollegeEmail(e.target.value)}
                  placeholder="your.name@iitd.ac.in"
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3.5 py-2 text-sm outline-none focus:border-[#e63f24]"
                />
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium hover:border-[#e63f24]"
                >
                  Send OTP
                </button>
              </div>

              {demoOtpHint && (
                <form onSubmit={handleVerifyOtp} className="space-y-2.5 pt-1">
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-3.5 py-2 text-xs text-amber-800 dark:text-amber-300">
                    TEST MODE OTP for {collegeEmail}: <strong>{demoOtpHint}</strong>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={enteredOtp}
                      onChange={(e) => setEnteredOtp(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3.5 py-2 text-sm outline-none focus:border-[#e63f24]"
                      required
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#e63f24] text-white text-xs font-medium"
                    >
                      Verify OTP
                    </button>
                  </div>
                </form>
              )}
            </div>

            <form
              onSubmit={handleIdSubmit}
              className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3"
            >
              <h3 className="text-sm font-medium">
                Method 2: Upload Student ID Photo (Reviewed by Admin)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={studentIdNumber}
                  onChange={(e) => setStudentIdNumber(e.target.value)}
                  placeholder="Roll Number / Campus ID"
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3.5 py-2 text-sm outline-none focus:border-[#e63f24]"
                  required
                />
                <label className="inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-medium cursor-pointer hover:border-[#e63f24]">
                  <Upload className="w-4 h-4" />
                  <span>{idPhotoData ? 'ID Photo Ready ✓' : 'Upload ID Card Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleIdPhotoPick}
                    className="hidden"
                  />
                </label>
              </div>
              {idPhotoData && (
                <img
                  src={idPhotoData}
                  alt="Uploaded student ID preview"
                  className="max-h-36 rounded-xl border border-slate-200 dark:border-slate-800"
                />
              )}
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-medium"
              >
                Submit ID for Admin Review
              </button>
            </form>
          </div>

          {verHistory.length > 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-5 space-y-2 text-xs">
              <div className="font-medium text-sm">Verification History</div>
              {verHistory.map((v) => (
                <div key={v.id} className="flex justify-between py-1.5 border-t border-slate-100 dark:border-slate-800">
                  <span>
                    {v.method === 'college_email_otp' ? `Email (${v.collegeEmail})` : `Student ID (${v.studentIdNumber})`}
                  </span>
                  <span className="font-semibold uppercase">{v.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'notifications' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
          {(Object.keys(NOTIFICATION_LABELS) as NotificationType[]).map((key) => {
            const enabled = user.notificationSettings?.[key] ?? true;
            return (
              <label
                key={key}
                className="px-6 py-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40"
              >
                <span className="text-sm">{NOTIFICATION_LABELS[key]}</span>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => handleToggleNotification(key)}
                  className="w-4 h-4 accent-[#e63f24]"
                />
              </label>
            );
          })}
        </div>
      )}

      {tab === 'privacy' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-6 space-y-4">
            <h2 className="text-base font-medium">Privacy Controls</h2>
            <label className="flex items-center justify-between gap-4 cursor-pointer text-sm">
              <span>Hide my last name on public cards &amp; profiles (e.g. Aarav S.)</span>
              <input
                type="checkbox"
                checked={user.privacySettings?.hideLastName ?? false}
                onChange={(e) =>
                  updateProfile({
                    privacySettings: {
                      ...user.privacySettings,
                      hideLastName: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 accent-[#e63f24]"
              />
            </label>
            <label className="flex items-center justify-between gap-4 cursor-pointer text-sm">
              <span>Hide WhatsApp number until booking is Accepted</span>
              <input
                type="checkbox"
                checked={user.privacySettings?.hidePhoneUntilAccepted ?? true}
                onChange={(e) =>
                  updateProfile({
                    privacySettings: {
                      ...user.privacySettings,
                      hidePhoneUntilAccepted: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 accent-[#e63f24]"
              />
            </label>
          </div>

          {blockedUsers.length > 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-6 space-y-3">
              <h2 className="text-base font-medium">Blocked Users</h2>
              {blockedUsers.map((bu) => (
                <div key={bu.id} className="flex items-center justify-between text-sm">
                  <span>{bu.name}</span>
                  <button
                    type="button"
                    onClick={async () => {
                      await moderationService.unblockUser(user.id, bu.id);
                      await loadExtras();
                      showToast(`Unblocked ${bu.firstName}`, 'info');
                    }}
                    className="text-xs font-medium text-[#e63f24] hover:underline"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-6 space-y-4">
            <h2 className="text-base font-medium flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#e63f24]" />
              <span>Data Export &amp; Account Deletion</span>
            </h2>
            <p className="text-xs text-slate-500">
              Download a full JSON copy of your Rentigo profile, listings, bookings, reviews, and receipts at any time, or permanently remove your account.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleExportData}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium hover:border-[#e63f24]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download My Data (JSON)</span>
              </button>

              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={deleteAccount}
                    className="px-4 py-2 rounded-xl bg-[#e63f24] text-white text-xs font-medium"
                  >
                    Confirm Delete Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs text-slate-500"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#e63f24]/30 text-xs font-medium text-[#e63f24] hover:bg-[#e63f24]/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Account</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
