import { AlertTriangle, BadgeCheck, Calendar, CreditCard, Gift, X } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { faqService } from '../services/faqService';
import { requestsService } from '../services/requestsService';
import type { Listing, PaymentRecord } from '../types/rentigo';
import { countInclusiveDays, datesOverlap, todayIsoDate } from '../utils/dates';

interface RequestModalProps {
  listing: Listing;
  bookedDates: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export function RequestModal({
  listing,
  bookedDates,
  onClose,
  onSuccess,
}: RequestModalProps) {
  const { user, refreshUsers } = useAuth();
  const { showToast } = useToast();
  const settings = faqService.getPlatformSettingsSync();
  const needsVerification = settings.requireVerificationToTransact && !user?.isVerified;

  const minDate =
    todayIsoDate() > listing.availableFrom ? todayIsoDate() : listing.availableFrom;

  const [startDate, setStartDate] = useState(minDate);
  const [endDate, setEndDate] = useState(minDate);
  const [message, setMessage] = useState('');
  const [useCredits, setUseCredits] = useState(Boolean(user?.creditBalance));
  const [paymentMethod, setPaymentMethod] = useState<PaymentRecord['method']>('upi_test');
  const [upiId, setUpiId] = useState('student@okaxis');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const calculation = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) {
      return { valid: false, days: 0, rentalCost: 0, grossTotal: 0, creditsApplied: 0, netDue: 0 };
    }
    const days = countInclusiveDays(startDate, endDate);
    const rentalCost = days * listing.pricePerDay;
    const grossTotal = rentalCost + listing.deposit;
    const creditsApplied = useCredits
      ? Math.min(grossTotal, user?.creditBalance ?? 0)
      : 0;
    return {
      valid: true,
      days,
      rentalCost,
      grossTotal,
      creditsApplied,
      netDue: Math.max(0, grossTotal - creditsApplied),
    };
  }, [endDate, listing.deposit, listing.pricePerDay, startDate, useCredits, user?.creditBalance]);

  const conflictDate = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) return null;
    return bookedDates.find((d) => datesOverlap(startDate, endDate, d, d)) ?? null;
  }, [bookedDates, endDate, startDate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError('');

    if (needsVerification) {
      setError('Verify your student account in Settings before sending a rental request.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Please pick both a start date and an end date.');
      return;
    }
    if (endDate < startDate) {
      setError('End date cannot be before start date.');
      return;
    }
    if (startDate < listing.availableFrom || endDate > listing.availableTo) {
      setError(
        `Dates must be between ${listing.availableFrom} and ${listing.availableTo}.`,
      );
      return;
    }
    if (conflictDate) {
      setError(
        `Selected range includes ${conflictDate}, which is already booked. Pick open dates.`,
      );
      return;
    }

    setSubmitting(true);
    try {
      await requestsService.create({
        listingId: listing.id,
        renterId: user.id,
        startDate,
        endDate,
        message,
        creditsToUse: calculation.creditsApplied,
        paymentMethod,
        upiId: paymentMethod === 'upi_test' ? upiId : undefined,
      });
      await refreshUsers();
      showToast('Test checkout complete & rental request sent!', 'success');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rentigo-request-title"
    >
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101d] text-slate-900 dark:text-slate-100 shadow-2xl">
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-5 py-2 text-[11px] font-semibold text-amber-800 dark:text-amber-300 text-center">
          TEST MODE — Test payments, no real money
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#e63f24]" />
            <h2 id="rentigo-request-title" className="text-base font-medium">
              Book &amp; Test Checkout
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close request modal"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
            {listing.title}
          </div>

          {needsVerification && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Student verification required before requesting.</p>
                <Link
                  to="/settings?tab=verify"
                  onClick={onClose}
                  className="inline-flex items-center gap-1 mt-1 font-semibold text-[#e63f24] hover:underline"
                >
                  <BadgeCheck className="w-3.5 h-3.5" />
                  Verify via .edu/.ac.in email or ID card →
                </Link>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-[#e63f24]/30 bg-[#e63f24]/10 px-3.5 py-2.5 text-sm text-[#e63f24]">
              {error}
            </div>
          )}

          {conflictDate && !error && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-700 dark:text-amber-300">
              Heads up: {conflictDate} is already booked. Choose non-overlapping dates.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                min={minDate}
                max={listing.availableTo}
                onChange={(e) => {
                  const val = e.target.value;
                  setStartDate(val);
                  if (endDate < val) setEndDate(val);
                }}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070a12] px-3.5 py-2.5 text-sm outline-none focus:border-[#e63f24]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate || minDate}
                max={listing.availableTo}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070a12] px-3.5 py-2.5 text-sm outline-none focus:border-[#e63f24]"
                required
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3.5 py-2.5 text-xs text-slate-600 dark:text-slate-400 flex flex-wrap justify-between gap-2">
            <span>
              Cancellation: <strong className="text-slate-900 dark:text-slate-200">{listing.cancellationPolicy}</strong>
            </span>
            <span>
              Late fee: <strong className="text-slate-900 dark:text-slate-200">₹{listing.lateFeePerDay}/day</strong>
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Message to Owner (Optional)
            </label>
            <textarea
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Hi! I'd love to pick this up at ${listing.pickupLocation}.`}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070a12] px-3.5 py-2 text-sm outline-none focus:border-[#e63f24]"
            />
          </div>

          {(user?.creditBalance ?? 0) > 0 && (
            <label className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 cursor-pointer text-xs">
              <span className="flex items-center gap-2 font-medium text-emerald-800 dark:text-emerald-300">
                <Gift className="w-4 h-4" />
                Apply Rentigo referral credits (₹{user?.creditBalance.toLocaleString('en-IN')} available)
              </span>
              <input
                type="checkbox"
                checked={useCredits}
                onChange={(e) => setUseCredits(e.target.checked)}
                className="accent-emerald-600"
              />
            </label>
          )}

          <div>
            <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Test Payment Method</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('upi_test')}
                className={`px-3 py-2 rounded-xl border text-xs font-medium text-left ${
                  paymentMethod === 'upi_test'
                    ? 'border-[#e63f24] bg-[#e63f24]/10 text-[#e63f24]'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                UPI (Test)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('card_test')}
                className={`px-3 py-2 rounded-xl border text-xs font-medium text-left ${
                  paymentMethod === 'card_test'
                    ? 'border-[#e63f24] bg-[#e63f24]/10 text-[#e63f24]'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                Razorpay Card (Test)
              </button>
            </div>
            {paymentMethod === 'upi_test' && (
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="yourname@okaxis"
                className="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070a12] px-3.5 py-2 text-xs outline-none focus:border-[#e63f24]"
              />
            )}
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] p-4 space-y-2 text-sm tabular-nums">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span>
                ₹{listing.pricePerDay.toLocaleString('en-IN')} × {calculation.days} day
                {calculation.days === 1 ? '' : 's'}
              </span>
              <span>₹{calculation.rentalCost.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span>Refundable security deposit</span>
              <span>₹{listing.deposit.toLocaleString('en-IN')}</span>
            </div>
            {calculation.creditsApplied > 0 && (
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                <span>Rentigo credits applied</span>
                <span>−₹{calculation.creditsApplied.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between font-semibold text-slate-950 dark:text-white">
              <span>Total Test Checkout</span>
              <span>₹{calculation.netDue.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !calculation.valid || Boolean(conflictDate) || needsVerification}
              className="px-5 py-2.5 rounded-xl bg-[#e63f24] hover:bg-[#cc3118] text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {submitting ? 'Processing...' : 'Pay (Test) & Send Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
