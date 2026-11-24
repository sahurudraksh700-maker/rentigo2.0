import { Star, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { REVIEW_TAGS, reviewsService } from '../services/reviewsService';

interface ReviewModalProps {
  requestId: string;
  targetName: string;
  listingTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReviewModal({
  requestId,
  targetName,
  listingTitle,
  onClose,
  onSuccess,
}: ReviewModalProps) {
  const { user, refreshUsers } = useAuth();
  const { showToast } = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState<string[]>(['On time', 'Item as described']);
  const [busy, setBusy] = useState(false);

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag].slice(0, 4),
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      await reviewsService.create({
        requestId,
        reviewerId: user.id,
        rating,
        comment,
        tags,
      });
      await refreshUsers();
      showToast('Review published — thanks for building campus trust', 'success');
      onSuccess();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to submit review', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rentigo-review-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101d] text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 id="rentigo-review-title" className="text-base font-medium">
            Review {targetName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close review modal"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Booking: <span className="font-medium text-slate-800 dark:text-slate-200">{listingTitle}</span>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
              Star Rating
            </div>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  aria-label={`Rate ${star} stars`}
                  className="p-1"
                >
                  <Star
                    className={`w-7 h-7 transition-colors ${
                      star <= rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-300 dark:text-slate-700'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
              Highlights
            </div>
            <div className="flex flex-wrap gap-2">
              {REVIEW_TAGS.map((tag) => {
                const active = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      active
                        ? 'border-[#e63f24] bg-[#e63f24]/10 text-[#e63f24]'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Comment
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={`How did your handover with ${targetName} go?`}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070a12] px-3.5 py-2.5 text-sm outline-none focus:border-[#e63f24]"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
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
              className="px-5 py-2.5 rounded-xl bg-[#e63f24] hover:bg-[#cc3118] text-white text-sm font-medium disabled:opacity-50"
            >
              {busy ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
