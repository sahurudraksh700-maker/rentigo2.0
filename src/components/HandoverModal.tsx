import { Camera, CheckSquare, Upload, X } from 'lucide-react';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { requestsService } from '../services/requestsService';
import type { RentalRequest } from '../types/rentigo';

const DEFAULT_CHECKLIST_ITEMS = {
  pickup: [
    'Physical body inspected (no unreported cracks/tears)',
    'Power-on / core function tested together',
    'All cables, chargers, batteries or accessories included',
    'Pickup location & return deadline agreed',
  ],
  return: [
    'Item returned clean & complete with all accessories',
    'Core function tested again on handover',
    'Condition matches pickup photos',
  ],
};

interface HandoverModalProps {
  request: RentalRequest;
  listingTitle: string;
  stage: 'pickup' | 'return';
  onClose: () => void;
  onSuccess: () => void;
}

export function HandoverModal({
  request,
  listingTitle,
  stage,
  onClose,
  onSuccess,
}: HandoverModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const existing = stage === 'pickup' ? request.pickupChecklist : request.returnChecklist;

  const [checkedItems, setCheckedItems] = useState<string[]>(
    existing?.itemsChecked ?? [DEFAULT_CHECKLIST_ITEMS[stage][0]],
  );
  const [notes, setNotes] = useState(existing?.conditionNotes ?? '');
  const [photos, setPhotos] = useState<string[]>(existing?.photos ?? []);
  const [busy, setBusy] = useState(false);

  const toggleItem = (label: string) => {
    setCheckedItems((prev) =>
      prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label],
    );
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 4 - photos.length);
    if (files.length === 0) return;

    const encoded = await Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
            reader.readAsDataURL(file);
          }),
      ),
    );
    setPhotos((prev) => [...prev, ...encoded.filter(Boolean)].slice(0, 4));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      await requestsService.submitHandoverChecklist({
        requestId: request.id,
        actorId: user.id,
        stage,
        itemsChecked: checkedItems,
        conditionNotes: notes,
        photos,
      });
      showToast(
        `${stage === 'pickup' ? 'Pickup' : 'Return'} checklist saved`,
        'success',
      );
      onSuccess();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save checklist', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rentigo-handover-title"
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101d] text-slate-900 dark:text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-[#e63f24]" />
            <h2 id="rentigo-handover-title" className="text-base font-medium">
              {stage === 'pickup' ? 'Pickup Handover Checklist' : 'Return Inspection Checklist'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close handover modal"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="text-sm font-medium">{listingTitle}</div>

          {existing && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3.5 py-2.5 text-xs text-slate-600 dark:text-slate-400 flex flex-wrap gap-3">
              <span>Owner confirmed: {existing.confirmedByOwner ? 'Yes' : 'Pending'}</span>
              <span>Renter confirmed: {existing.confirmedByRenter ? 'Yes' : 'Pending'}</span>
            </div>
          )}

          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Handover verification points
            </div>
            {DEFAULT_CHECKLIST_ITEMS[stage].map((item) => (
              <label
                key={item}
                className="flex items-start gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-xs cursor-pointer hover:border-[#e63f24]"
              >
                <input
                  type="checkbox"
                  checked={checkedItems.includes(item)}
                  onChange={() => toggleItem(item)}
                  className="mt-0.5 accent-[#e63f24]"
                />
                <span>{item}</span>
              </label>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Condition photos (up to 4 — timestamped with this booking)
            </label>
            <div className="flex flex-wrap gap-2.5">
              {photos.map((src, idx) => (
                <div
                  key={idx}
                  className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800"
                >
                  <img src={src} alt={`Handover photo ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                    aria-label="Remove handover photo"
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center text-[10px]"
                  >
                    ×
                  </button>
                </div>
              ))}
              {photos.length < 4 && (
                <label className="w-20 h-20 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center gap-1 text-[11px] text-slate-500 hover:border-[#e63f24] hover:text-[#e63f24] cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>Add</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            {photos.length === 0 && (
              <p className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
                <Camera className="w-3 h-3" />
                Adding a quick photo protects both owner and renter against false disputes.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Condition notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Note battery level, scratches, or accessories handed over..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070a12] px-3.5 py-2 text-sm outline-none focus:border-[#e63f24]"
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
              {busy ? 'Saving...' : 'Confirm Handover'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
