import { Copy, Download, QrCode, X } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';

interface QRCodeModalProps {
  title: string;
  url: string;
  onClose: () => void;
}

export function QRCodeModal({ title, url, onClose }: QRCodeModalProps) {
  const [dataUrl, setDataUrl] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(url, {
      width: 280,
      margin: 2,
      color: { dark: '#0b0f1b', light: '#ffffff' },
    })
      .then((res) => {
        if (active) setDataUrl(res);
      })
      .catch(() => {
        // ignore QR error
      });
    return () => {
      active = false;
    };
  }, [url]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      showToast('Listing link copied', 'success');
    } catch {
      showToast('Could not copy link', 'error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rentigo-qr-title"
    >
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101d] p-6 text-slate-900 dark:text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-[#e63f24]" />
            <h2 id="rentigo-qr-title" className="text-base font-medium">
              Scan to rent
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close QR code modal"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-5 flex flex-col items-center text-center">
          <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-sm">
            {dataUrl ? (
              <img src={dataUrl} alt={`QR code for ${title}`} className="w-52 h-52" />
            ) : (
              <div className="w-52 h-52 animate-pulse bg-slate-100 rounded-xl" />
            )}
          </div>
          <p className="mt-3 text-sm font-medium line-clamp-2">{title}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 break-all">{url}</p>

          <div className="mt-5 grid grid-cols-2 gap-2.5 w-full">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium hover:border-[#e63f24]"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Link</span>
            </button>
            {dataUrl && (
              <a
                href={dataUrl}
                download={`rentigo-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#e63f24] hover:bg-[#cc3118] text-white text-xs font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save PNG</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
