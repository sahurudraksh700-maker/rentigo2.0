import { Component, useState, type ErrorInfo, type ReactNode } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { AppFooter } from './components/AppFooter';
import { GoogleSignInModal } from './components/GoogleSignInModal';
import { KageLandingWrapper } from './components/KageLandingWrapper';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Navbar } from './components/Navbar';
import { OfflineIndicator } from './components/OfflineIndicator';
import { RentigoChatbot } from './components/RentigoChatbot';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AdminPage } from './pages/AdminPage';
import { BrowsePage } from './pages/BrowsePage';
import { DashboardPage } from './pages/DashboardPage';
import { ListingDetailPage } from './pages/ListingDetailPage';
import { ListingFormPage } from './pages/ListingFormPage';
import { MessagesPage } from './pages/MessagesPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { PublicProfilePage } from './pages/PublicProfilePage';
import { ReferralsPage } from './pages/ReferralsPage';
import { SafetyPage } from './pages/SafetyPage';
import { SettingsPage } from './pages/SettingsPage';
import { FaqPage, GuidelinesPage, PrivacyPage, TermsPage } from './pages/StaticInfoPages';
import { WantedBoardPage } from './pages/WantedBoardPage';
import { WishlistPage } from './pages/WishlistPage';

function NotFoundPage() {
  return (
    <main className="max-w-xl mx-auto px-4 py-16 text-center">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-10">
        <h1 className="text-2xl font-normal text-slate-950 dark:text-white">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Head back to the campus catalog to find cameras, projectors, cycles, or formal wear.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/browse"
            className="px-5 py-2.5 rounded-xl bg-[#e63f24] text-white text-sm font-medium"
          >
            Browse Rentals
          </Link>
          <Link
            to="/"
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}

function AppShell() {
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const [pastHero, setPastHero] = useState(false);

  const showChatbot = !isLanding || pastHero;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#060810] text-slate-900 dark:text-[#eceff4] transition-colors">
      <OfflineIndicator />
      {!isLanding && <Navbar />}
      <div className="flex-1">
        <Routes>
          <Route
            path="/"
            element={<KageLandingWrapper onScrollPastHeroChange={setPastHero} />}
          />
          <Route path="/browse" element={<BrowsePage />} />
          <Route path="/wanted" element={<WantedBoardPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/u/:id" element={<PublicProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/referrals" element={<ReferralsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/listings/new" element={<ListingFormPage />} />
          <Route path="/listings/:id/edit" element={<ListingFormPage />} />
          <Route path="/listing/:id" element={<ListingDetailPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/safety" element={<SafetyPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/guidelines" element={<GuidelinesPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
      {!isLanding && <AppFooter />}
      {!isLanding && <MobileBottomNav />}
      <RentigoChatbot visible={showChatbot} />
      <GoogleSignInModal />
    </div>
  );
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Unexpected rendering error',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Rentigo] Uncaught render error:', error, info);
  }

  private handleResetAndBrowse = () => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('rentigo_') || key.startsWith('rk_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch {
      // Ignore storage access errors in restricted iframes
    }
    window.location.href = '/browse';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#060810',
            color: '#eceff4',
            padding: '24px',
            fontFamily: 'Onest, system-ui, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: '440px',
              width: '100%',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.12)',
              backgroundColor: '#0b0f1b',
              padding: '28px',
              textAlign: 'center',
            }}
          >
            <h1 style={{ fontSize: '20px', fontWeight: 500, margin: 0 }}>
              Something went wrong loading Rentigo
            </h1>
            <p
              style={{
                fontSize: '13px',
                color: '#94a3b8',
                marginTop: '10px',
                lineHeight: 1.5,
                wordBreak: 'break-word',
              }}
            >
              {this.state.message}
            </p>
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={this.handleResetAndBrowse}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: '#e63f24',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Reset Cache &amp; Open Browse
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.16)',
                  backgroundColor: 'transparent',
                  color: '#eceff4',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <LanguageProvider>
            <ToastProvider>
              <AuthProvider>
                <AppShell />
              </AuthProvider>
            </ToastProvider>
          </LanguageProvider>
        </ThemeProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}
