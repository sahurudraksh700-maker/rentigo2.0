import { Flag, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { moderationService } from '../services/moderationService';
import type { ReportTargetType } from '../types/rentigo';

interface ReportModalProps {
  targetType?: ReportTargetType;
  targetId?: string;
  listingId?: string;
  targetUserId?: string;
  listingTitle: string;
  onClose: () => void;
}

const REPORT_REASONS_BY_TYPE: Record<ReportTargetType, string[]> = {
  listing: [
    'Misleading photos or description',
    'Prohibited or unsafe campus item',
    'Suspicious deposit or pricing',
    'Unresponsive or duplicate listing',
    'Other',
  ],
  user: [
    'Harassment or abusive behaviour',
    'No-show or repeated cancellation',
    'Fake student identity',
    'Off-platform payment scam attempt',
    'Other',
  ],
  message: [
    'Spam or unsolicited promotion',
    'Abusive or threatening message',
    'Attempted off-platform payment/scam',
    'Other',
  ],
  review: [
    'Contains abusive language or slurs',
    'Spam or unrelated review',
    'Retaliatory or factually false claim',
    'Other',
  ],
};

export function ReportModal({
  targetType = 'listing',
  targetId,
  listingId,
  targetUserId,
  listingTitle,
  onClose,
}: ReportModalProps) {
  const { user, openSignIn } = useAuth();
  const { showToast } = useToast();
  const reasons = REPORT_REASONS_BY_TYPE[targetType];
  const [reason, setReason] = useState(reasons[0]);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const effectiveTargetId = targetId ?? listingId ?? targetUserId ?? '';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      openSignIn();
      return;
    }
    setSubmitting(true);
    try {
      const { autoHiddenListing } = await moderationService.submitReport({
        targetType,
        targetId: effectiveTargetId,
        listingId,
        targetUserId,
        reporterId: user.id,
        reason,
        details,
      });
      showToast(
        autoHiddenListing
          ? 'Report submitted. This listing was automatically hidden pending admin review.'
          : 'Report submitted. Campus moderators will review it.',
        'success',
      );
      onClose();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Could not submit report. Please try again.',
        'error',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rentigo-report-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101d] text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-[#e63f24]" />
            <h2 id="rentigo-report-title" className="text-base font-medium capitalize">
              Report {targetType}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close report dialog"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Reporting:{' '}
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {listingTitle}
            </span>
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070a12] px-3.5 py-2.5 text-sm outline-none focus:border-[#e63f24]"
            >
              {reasons.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Additional Details
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Share what looks off so our campus team can verify."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070a12] px-3.5 py-2.5 text-sm outline-none focus:border-[#e63f24]"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-[#e63f24] hover:bg-[#cc3118] text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
