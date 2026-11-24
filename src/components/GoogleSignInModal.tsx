import { ArrowRight, Gift, Shield, UserPlus, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';

export function GoogleSignInModal() {
  const {
    signInOpen,
    closeSignIn,
    allUsers,
    pendingReferralCode,
    signInWithPreset,
    signInCustom,
  } = useAuth();
  const [mode, setMode] = useState<'pick' | 'custom'>('pick');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [college, setCollege] = useState('');
  const [phone, setPhone] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (pendingReferralCode && !referralCode) {
      setReferralCode(pendingReferralCode);
    }
  }, [pendingReferralCode, referralCode]);

  if (!signInOpen) return null;

  const handlePreset = async (userId: string) => {
    setBusy(true);
    setError('');
    try {
      await signInWithPreset(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  };

  const handleCustomSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid Google or campus email address.');
      return;
    }
    if (!college.trim()) {
      setError('Enter your college name and hostel/block.');
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      setError('Enter a valid 10-digit WhatsApp or phone number.');
      return;
    }
    setBusy(true);
    try {
      await signInCustom({
        name,
        email,
        college,
        phone,
        referralCode: referralCode.trim() || undefined,
      });
      setName('');
      setEmail('');
      setCollege('');
      setPhone('');
      setReferralCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rentigo-google-signin-title"
    >
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101d] text-slate-900 dark:text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <h2 id="rentigo-google-signin-title" className="text-base font-medium">
              Sign in with Google
            </h2>
          </div>
          <button
            type="button"
            onClick={closeSignIn}
            aria-label="Close sign in dialog"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Choose a campus demo account to continue to Rentigo, or create an account with your
            own email.
          </p>

          {pendingReferralCode && (
            <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <Gift className="w-4 h-4 shrink-0" />
              <span>
                Referral code <strong>{pendingReferralCode}</strong> ready! Use &ldquo;Create /
                Use another Google account&rdquo; to apply it.
              </span>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl border border-[#e63f24]/30 bg-[#e63f24]/10 px-3.5 py-2.5 text-sm text-[#e63f24]">
              {error}
            </div>
          )}

          {mode === 'pick' ? (
            <div className="space-y-2.5">
              {allUsers.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  disabled={busy}
                  onClick={() => handlePreset(account.id)}
                  className="w-full flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 text-left hover:border-[#e63f24] hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#e63f24]/15 text-[#e63f24] font-semibold text-sm flex items-center justify-center shrink-0">
                      {account.firstName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate flex items-center gap-1.5">
                        <span>{account.name}</span>
                        {account.role === 'admin' && (
                          <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                            <Shield className="w-2.5 h-2.5" />
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {account.email} · {account.college}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  setError('');
                  setMode('custom');
                }}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:border-[#e63f24] hover:text-[#e63f24] transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>Use another Google account</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleCustomSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Rohan Verma"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070a12] px-3.5 py-2.5 text-sm outline-none focus:border-[#e63f24]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Campus / Google Email (.edu or .ac.in auto-verifies)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rohan.verma@iitd.ac.in"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070a12] px-3.5 py-2.5 text-sm outline-none focus:border-[#e63f24]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  College & Hostel
                </label>
                <input
                  type="text"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  placeholder="IIT Madras · Ganga Hostel"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070a12] px-3.5 py-2.5 text-sm outline-none focus:border-[#e63f24]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  WhatsApp / Phone Number (hidden until booking Accepted)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070a12] px-3.5 py-2.5 text-sm outline-none focus:border-[#e63f24]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Referral Code (Optional — ₹50 credit after 1st completed rental)
                </label>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="AARAV50"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070a12] px-3.5 py-2.5 text-sm uppercase outline-none focus:border-[#e63f24]"
                />
              </div>
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setMode('pick');
                  }}
                  className="px-4 py-2.5 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-5 py-2.5 rounded-xl bg-[#e63f24] hover:bg-[#cc3118] text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {busy ? 'Signing in...' : 'Continue with Google'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
