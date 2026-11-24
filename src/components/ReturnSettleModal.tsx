import { CheckCircle2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { requestsService } from '../services/requestsService';
import type { DepositStatus, RentalRequest } from '../types/rentigo';

interface ReturnSettleModalProps {
  request: RentalRequest;
  listingTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReturnSettleModal({
  request,
  listingTitle,
  onClose,
  onSuccess,
}: ReturnSettleModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [depositStatus, setDepositStatus] = useState<DepositStatus>('Released');
  const [deductionAmount, setDeductionAmount] = useState(0);
  const [deductionReason, setDeductionReason] = useState('');
  const [lateDays, setLateDays] = useState(0);
  const [busy, setBusy] = useState(false);

  const lateFee = Math.max(0, lateDays) * (request.lateFeePerDaySnapshot || 0);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (depositStatus === 'Partially Deducted' && (deductionAmount <= 0 || !deductionReason.trim())) {
      showToast('Enter a valid deduction amount and reason.', 'error');
      return;
    }

    setBusy(true);
    try {
      await requestsService.updateStatus(request.id, user.id, 'Returned', {
        depositStatus,
        depositDeductionAmount:
          depositStatus === 'Partially Deducted' ? deductionAmount : 0,
        depositDeductionReason:
          depositStatus === 'Partially Deducted' ? deductionReason : undefined,
        lateDays,
      });
      showToast('Item marked returned & deposit settled', 'success');
      onSuccess();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to complete return', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rentigo-return-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101d] text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <h2 id="rentigo-return-title" className="text-base font-medium">
              Mark Returned & Settle Deposit
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close return settlement modal"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="text-sm font-medium">{listingTitle}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Security deposit held: ₹{request.depositSnapshot.toLocaleString('en-IN')} · Late fee
            rate: ₹{request.lateFeePerDaySnapshot.toLocaleString('en-IN')}/day
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Deposit settlement
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['Released', 'Partially Deducted'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setDepositStatus(status)}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-medium text-left transition-colors ${
                    depositStatus === status
                      ? 'border-[#e63f24] bg-[#e63f24]/10 text-[#e63f24]'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {status === 'Released' ? 'Release Full Deposit' : 'Partial Deduction'}
                </button>
              ))}
            </div>
          </div>

          {depositStatus === 'Partially Deducted' && (
            <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Deduction amount (max ₹{request.depositSnapshot.toLocaleString('en-IN')})
                </label>
                <input
                  type="number"
                  min={1}
                  max={request.depositSnapshot}
                  value={deductionAmount || ''}
                  onChange={(e) => setDeductionAmount(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070a12] px-3 py-2 text-sm outline-none focus:border-[#e63f24]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Reason for partial deduction
                </label>
                <textarea
                  rows={2}
                  value={deductionReason}
                  onChange={(e) => setDeductionReason(e.target.value)}
                  placeholder="e.g., Missing lens cap or charger cable damage"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070a12] px-3 py-2 text-sm outline-none focus:border-[#e63f24]"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Late return days (0 if returned on time)
            </label>
            <input
              type="number"
              min={0}
              max={30}
              value={lateDays}
              onChange={(e) => setLateDays(Math.max(0, Number(e.target.value)))}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070a12] px-3.5 py-2 text-sm outline-none focus:border-[#e63f24]"
            />
            {lateDays > 0 && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Late fee calculated: ₹{lateFee.toLocaleString('en-IN')} ({lateDays} day
                {lateDays === 1 ? '' : 's'})
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50"
            >
              {busy ? 'Completing...' : 'Complete Return'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
