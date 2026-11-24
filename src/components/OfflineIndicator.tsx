import { WifiOff, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

export function OfflineIndicator() {
  const [offline, setOffline] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const verifyConnectivity = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (navigator.onLine) {
      setOffline(false);
      setDismissed(false);
      return;
    }
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 2500);
      const res = await fetch('/icon.svg', {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      });
      window.clearTimeout(timer);
      if (res.ok || res.status < 500) {
        setOffline(false);
        setDismissed(false);
        return;
      }
    } catch {
      // Genuine network failure when both navigator.onLine is false and fetch fails
    }
    setOffline(!navigator.onLine);
  }, []);

  useEffect(() => {
    verifyConnectivity();
    const onOffline = () => {
      verifyConnectivity();
    };
    const onOnline = () => {
      setOffline(false);
      setDismissed(false);
    };
    const onFocus = () => {
      verifyConnectivity();
    };

    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('focus', onFocus);
    };
  }, [verifyConnectivity]);

  if (!offline || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 bg-amber-600 text-white px-4 py-2 text-xs font-medium flex items-center justify-center gap-2"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>
        Connection looks offline — your saved listings are still available locally.
      </span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss offline notice"
        className="ml-2 p-0.5 rounded hover:bg-black/15"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
