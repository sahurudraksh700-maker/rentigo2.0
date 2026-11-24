import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';

export function AppFooter() {
  const { user, openSignIn } = useAuth();

  return (
    <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#060810] mt-16 pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-slate-950 dark:text-[#eceff4]"
            >
              <img
                src="/assets/aistudio/Rentigo_Gradient_Circle_Logo_6bb3db80.png"
                alt="Rentigo official logo"
                className="w-8 h-8 rounded-full object-cover shrink-0"
              />
              <span>Rentigo</span>
            </Link>
            <PWAInstallButton compact />
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Don&apos;t buy it. Rent it from a classmate on campus.
          </p>
        </div>

        <nav
          className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600 dark:text-slate-400"
          aria-label="Footer navigation"
        >
          <Link to="/browse" className="hover:text-[#e63f24] transition-colors">
            Browse
          </Link>
          <Link to="/wanted" className="hover:text-[#e63f24] transition-colors">
            Wanted Board
          </Link>
          <Link to="/referrals" className="hover:text-[#e63f24] transition-colors">
            Refer &amp; Earn
          </Link>
          <Link to="/safety" className="hover:text-[#e63f24] transition-colors">
            Safety
          </Link>
          <Link to="/faq" className="hover:text-[#e63f24] transition-colors">
            FAQ
          </Link>
          <Link to="/guidelines" className="hover:text-[#e63f24] transition-colors">
            Guidelines
          </Link>
          <Link to="/terms" className="hover:text-[#e63f24] transition-colors">
            Terms
          </Link>
          <Link to="/privacy" className="hover:text-[#e63f24] transition-colors">
            Privacy
          </Link>
          {user ? (
            <Link to="/dashboard" className="hover:text-[#e63f24] transition-colors">
              Dashboard
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => openSignIn('/browse')}
              className="hover:text-[#e63f24] transition-colors"
            >
              Sign in with Google
            </button>
          )}
          <a
            href="mailto:rentigo.campus@gmail.com"
            className="hover:text-[#e63f24] transition-colors"
          >
            rentigo.campus@gmail.com
          </a>
        </nav>
      </div>
    </footer>
  );
}
