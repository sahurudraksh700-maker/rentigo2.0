import { Receipt, ShieldCheck, X } from 'lucide-react';
import type { PaymentRecord, RentalRequest } from '../types/rentigo';
import { formatDisplayDate } from '../utils/dates';

interface ReceiptModalProps {
  payment: PaymentRecord;
  request: RentalRequest;
  listingTitle: string;
  onClose: () => void;
}

export function ReceiptModal({ payment, request, listingTitle, onClose }: ReceiptModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rentigo-receipt-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101d] text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden">
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-5 py-2 text-[11px] font-semibold text-amber-800 dark:text-amber-300 text-center">
          TEST MODE — Test payment receipt, no real money charged
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#e63f24]" />
            <h2 id="rentigo-receipt-title" className="text-base font-medium">
              Payment Receipt · {payment.receiptNumber}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close receipt modal"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-sm tabular-nums">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Item</div>
            <div className="font-medium mt-0.5">{listingTitle}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {formatDisplayDate(request.startDate)} → {formatDisplayDate(request.endDate)} ({request.days}{' '}
              days)
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] p-4 space-y-2">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Rental fee</span>
              <span>₹{payment.rentalSubtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Security deposit ({request.depositStatus})</span>
              <span>₹{payment.depositAmount.toLocaleString('en-IN')}</span>
            </div>
            {payment.creditsApplied > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Rentigo credits redeemed</span>
                <span>−₹{payment.creditsApplied.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between font-semibold">
              <span>Paid ({payment.method.replace('_', ' ').toUpperCase()})</span>
              <span>₹{payment.amountPaid.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              Test Checkout Verified
            </span>
            <span>{new Date(payment.createdAt).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
