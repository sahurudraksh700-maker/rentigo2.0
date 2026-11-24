import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  ImagePlus,
  PauseCircle,
  PlayCircle,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CAMPUS_OPTIONS } from '../data/seedData';
import { faqService } from '../services/faqService';
import { listingsService } from '../services/listingsService';
import {
  LISTING_CATEGORIES,
  type CancellationPolicy,
  type ItemCondition,
  type ListingCategory,
} from '../types/rentigo';
import { extractCampusName } from '../utils/badges';
import { todayIsoDate } from '../utils/dates';
import { usePageMeta } from '../utils/seo';

const SAMPLE_PHOTOS = [
  { label: 'Camera', url: '/src/assets/images/listing_sony_camera_1795450626545.jpg' },
  { label: 'Projector', url: '/src/assets/images/listing_benq_projector_1795450626441.jpg' },
  { label: 'Blazer', url: '/src/assets/images/listing_navy_blazer_1795450626152.jpg' },
  { label: 'Cycle', url: '/src/assets/images/listing_hybrid_cycle_1795450626175.jpg' },
  { label: 'Books', url: '/src/assets/images/listing_textbooks_bundle_1795450626454.jpg' },
  { label: 'Electronics', url: '/src/assets/images/listing_electronics_kit_1795450626569.jpg' },
];

async function resizeImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read selected file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Unsupported image format.'));
      img.onload = () => {
        const maxDim = 920;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function defaultEndDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 45);
  return d.toISOString().slice(0, 10);
}

export function ListingFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, openSignIn } = useAuth();
  const { showToast } = useToast();

  usePageMeta({
    title: isEdit ? 'Edit Listing — Rentigo' : 'List an Item — Rentigo',
  });

  const settings = faqService.getPlatformSettingsSync();
  const needsVerification = Boolean(
    user && settings.requireVerificationToTransact && !user.isVerified && !isEdit,
  );

  const [loading, setLoading] = useState(isEdit);
  const [notAllowed, setNotAllowed] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ListingCategory>('Cameras');
  const [condition, setCondition] = useState<ItemCondition>('Good');
  const [pricePerDay, setPricePerDay] = useState('200');
  const [deposit, setDeposit] = useState('1000');
  const [lateFeePerDay, setLateFeePerDay] = useState('100');
  const [cancellationPolicy, setCancellationPolicy] =
    useState<CancellationPolicy>('Flexible');
  const [pickupLocation, setPickupLocation] = useState('Central Library Steps');
  const [college, setCollege] = useState(
    user ? extractCampusName(user.college) : 'IIT Delhi',
  );
  const [availableFrom, setAvailableFrom] = useState(todayIsoDate());
  const [availableTo, setAvailableTo] = useState(defaultEndDate());
  const [photos, setPhotos] = useState<string[]>([]);
  const [isPaused, setIsPaused] = useState(false);

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!isEdit && user) {
      setCollege(extractCampusName(user.college));
    }
  }, [isEdit, user]);

  useEffect(() => {
    if (!isEdit || !id) return;
    let active = true;
    setLoading(true);
    listingsService
      .getById(id)
      .then((found) => {
        if (!active) return;
        if (!found) {
          setNotAllowed('This listing does not exist.');
          return;
        }
        if (user && found.ownerId !== user.id) {
          setNotAllowed('Only the owner of this listing can edit it.');
          return;
        }
        setTitle(found.title);
        setDescription(found.description);
        setCategory(found.category);
        setCondition(found.condition);
        setPricePerDay(String(found.pricePerDay));
        setDeposit(String(found.deposit));
        setLateFeePerDay(String(found.lateFeePerDay ?? 100));
        setCancellationPolicy(found.cancellationPolicy ?? 'Flexible');
        setPickupLocation(found.pickupLocation);
        setCollege(found.college);
        setAvailableFrom(found.availableFrom);
        setAvailableTo(found.availableTo);
        setPhotos(found.photos);
        setIsPaused(found.isPaused);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, isEdit, user]);

  if (!user) {
    return (
      <main className="max-w-xl mx-auto px-4 sm:px-6 py-16">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-8 text-center">
          <h1 className="text-2xl font-normal text-slate-950 dark:text-white">
            Sign in to list an item
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Rentigo requires a verified student profile before you can post gear on campus.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => openSignIn(location.pathname)}
              className="px-5 py-2.5 rounded-xl bg-[#e63f24] hover:bg-[#cc3118] text-white text-sm font-medium transition-colors"
            >
              Sign in with Google
            </button>
            <Link
              to="/browse"
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Browse rentals
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 animate-pulse space-y-4">
        <div className="h-6 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-[520px] rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </main>
    );
  }

  if (notAllowed) {
    return (
      <main className="max-w-xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-8">
          <h1 className="text-xl font-medium text-slate-950 dark:text-white">
            {notAllowed}
          </h1>
          <Link
            to="/dashboard"
            className="mt-5 inline-flex px-5 py-2.5 rounded-xl bg-[#e63f24] text-white text-sm font-medium"
          >
            Go to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const remainingSlots = 4 - photos.length;
    if (remainingSlots <= 0) {
      showToast('Maximum 4 photos allowed per listing.', 'info');
      return;
    }

    try {
      const converted = await Promise.all(
        files.slice(0, remainingSlots).map((file) => resizeImageToDataUrl(file)),
      );
      setPhotos((prev) => [...prev, ...converted].slice(0, 4));
      e.target.value = '';
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to process image upload.',
        'error',
      );
    }
  };

  const addSamplePhoto = (url: string) => {
    if (photos.length >= 4) {
      showToast('You already have 4 photos.', 'info');
      return;
    }
    if (photos.includes(url)) {
      showToast('That sample photo is already added.', 'info');
      return;
    }
    setPhotos((prev) => [...prev, url]);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const numericPrice = Number(pricePerDay);
    const numericDeposit = Number(deposit);
    const numericLateFee = Number(lateFeePerDay);

    if (title.trim().length < 4) {
      setError('Enter a clear item title (at least 4 characters).');
      return;
    }
    if (description.trim().length < 15) {
      setError('Describe condition, accessories, and rules (at least 15 characters).');
      return;
    }
    if (photos.length === 0) {
      setError('Upload or select at least 1 photo so classmates can see the item.');
      return;
    }
    if (!Number.isFinite(numericPrice) || numericPrice < 10) {
      setError('Price per day must be at least ₹10.');
      return;
    }
    if (!Number.isFinite(numericDeposit) || numericDeposit < 0) {
      setError('Deposit cannot be negative.');
      return;
    }
    if (!pickupLocation.trim()) {
      setError('Enter a campus pickup location.');
      return;
    }
    if (!availableFrom || !availableTo || availableTo < availableFrom) {
      setError('Available end date must be on or after the start date.');
      return;
    }

    setSaving(true);
    try {
      if (isEdit && id) {
        await listingsService.update(id, user.id, {
          title,
          description,
          category,
          condition,
          pricePerDay: numericPrice,
          deposit: numericDeposit,
          lateFeePerDay: numericLateFee,
          cancellationPolicy,
          pickupLocation,
          college,
          availableFrom,
          availableTo,
          photos,
        });
        showToast('Listing updated', 'success');
        navigate(`/listing/${id}`);
      } else {
        const created = await listingsService.create({
          ownerId: user.id,
          title,
          description,
          category,
          condition,
          pricePerDay: numericPrice,
          deposit: numericDeposit,
          lateFeePerDay: numericLateFee,
          cancellationPolicy,
          pickupLocation,
          college,
          availableFrom,
          availableTo,
          photos,
        });
        showToast('Listing published on campus!', 'success');
        navigate(`/listing/${created.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save listing.');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePause = async () => {
    if (!id) return;
    try {
      const updated = await listingsService.togglePause(id, user.id);
      setIsPaused(updated.isPaused);
      showToast(
        updated.isPaused ? 'Listing paused' : 'Listing is active again',
        'info',
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Action failed.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await listingsService.remove(id, user.id);
      showToast('Listing deleted', 'info');
      navigate('/dashboard?tab=listings');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed.', 'error');
    }
  };

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <Link
          to={isEdit && id ? `/listing/${id}` : '/browse'}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isEdit ? 'Back to listing' : 'Back to Browse'}</span>
        </Link>

        {isEdit && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePause}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-[#e63f24] transition-colors"
            >
              {isPaused ? (
                <>
                  <PlayCircle className="w-4 h-4 text-emerald-500" />
                  <span>Resume Listing</span>
                </>
              ) : (
                <>
                  <PauseCircle className="w-4 h-4 text-amber-500" />
                  <span>Pause Listing</span>
                </>
              )}
            </button>

            {confirmDelete ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-2 rounded-xl bg-[#e63f24] text-white text-xs font-medium"
                >
                  Confirm Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-2 rounded-xl text-xs text-slate-500"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-[#e63f24] hover:bg-[#e63f24]/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-normal tracking-tight text-slate-950 dark:text-[#eceff4]">
          {isEdit ? 'Edit Listing' : 'List an Item for Rent'}
        </h1>
        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
          Turn idle gear in your hostel room into pocket money while helping a classmate out.
        </p>

        {needsVerification && (
          <div className="mt-5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">
                Student verification is currently required to publish listings.
              </p>
              <Link
                to="/settings?tab=verify"
                className="inline-flex items-center gap-1 mt-1 font-semibold text-[#e63f24] hover:underline"
              >
                <BadgeCheck className="w-3.5 h-3.5" />
                Verify with .edu/.ac.in email or student ID →
              </Link>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {error && (
            <div className="rounded-xl border border-[#e63f24]/30 bg-[#e63f24]/10 px-4 py-3 text-sm text-[#e63f24]">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Item Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sony A6400 Mirrorless + 35mm Lens"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3.5 py-2.5 text-sm text-slate-950 dark:text-white outline-none focus:border-[#e63f24]"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ListingCategory)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3.5 py-2.5 text-sm text-slate-950 dark:text-white outline-none focus:border-[#e63f24]"
              >
                {LISTING_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Condition
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as ItemCondition)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3.5 py-2.5 text-sm text-slate-950 dark:text-white outline-none focus:border-[#e63f24]"
              >
                <option value="New">New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Cancellation Policy
              </label>
              <select
                value={cancellationPolicy}
                onChange={(e) => setCancellationPolicy(e.target.value as CancellationPolicy)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3.5 py-2.5 text-sm text-slate-950 dark:text-white outline-none focus:border-[#e63f24]"
              >
                <option value="Flexible">Flexible (Full refund 24h before)</option>
                <option value="Moderate">Moderate (50% refund under 24h)</option>
                <option value="Strict">Strict (No refund after pickup day)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Price per day (₹)
              </label>
              <input
                type="number"
                min={10}
                value={pricePerDay}
                onChange={(e) => setPricePerDay(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3.5 py-2.5 text-sm text-slate-950 dark:text-white outline-none focus:border-[#e63f24] tabular-nums"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Refundable Deposit (₹)
              </label>
              <input
                type="number"
                min={0}
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3.5 py-2.5 text-sm text-slate-950 dark:text-white outline-none focus:border-[#e63f24] tabular-nums"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Late Return Fee / day (₹)
              </label>
              <input
                type="number"
                min={0}
                value={lateFeePerDay}
                onChange={(e) => setLateFeePerDay(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3.5 py-2.5 text-sm text-slate-950 dark:text-white outline-none focus:border-[#e63f24] tabular-nums"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Campus
              </label>
              <input
                type="text"
                list="rentigo-campus-suggestions"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                placeholder="IIT Delhi"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3.5 py-2.5 text-sm text-slate-950 dark:text-white outline-none focus:border-[#e63f24]"
                required
              />
              <datalist id="rentigo-campus-suggestions">
                {CAMPUS_OPTIONS.filter((c) => c !== 'All Campuses').map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Campus Pickup Location
              </label>
              <input
                type="text"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                placeholder="e.g. Hostel 4 Lobby / Central Library Steps"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3.5 py-2.5 text-sm text-slate-950 dark:text-white outline-none focus:border-[#e63f24]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Available From
              </label>
              <input
                type="date"
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3.5 py-2.5 text-sm text-slate-950 dark:text-white outline-none focus:border-[#e63f24]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Available Until
              </label>
              <input
                type="date"
                value={availableTo}
                min={availableFrom}
                onChange={(e) => setAvailableTo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3.5 py-2.5 text-sm text-slate-950 dark:text-white outline-none focus:border-[#e63f24]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Description &amp; Included Accessories
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Share condition details, what's included in the bag/box, and any usage tips for classmates."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3.5 py-2.5 text-sm text-slate-950 dark:text-white outline-none focus:border-[#e63f24]"
              required
            />
          </div>

          {/* Photo Upload + Preview (up to 4) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Photos ({photos.length}/4)
              </label>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-[#e63f24] cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Photos</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {photos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {photos.map((photo, idx) => (
                  <div
                    key={`${photo.slice(0, 32)}_${idx}`}
                    className="relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900"
                  >
                    <img
                      src={photo}
                      alt={`Listing preview ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      aria-label={`Remove photo ${idx + 1}`}
                      className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/70 text-white hover:bg-[#e63f24] transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    {idx === 0 && (
                      <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-medium">
                        Cover
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-col items-center gap-2">
                <ImagePlus className="w-6 h-6 text-slate-400" />
                <span>Upload up to 4 photos or pick a quick sample below</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] text-slate-400">Quick add photo:</span>
              {SAMPLE_PHOTOS.map((sp) => (
                <button
                  key={sp.label}
                  type="button"
                  onClick={() => addSamplePhoto(sp.url)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 hover:border-[#e63f24] transition-colors"
                >
                  + {sp.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <Link
              to={isEdit && id ? `/listing/${id}` : '/browse'}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || needsVerification}
              className="px-6 py-2.5 rounded-xl bg-[#e63f24] hover:bg-[#cc3118] text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Publish Listing'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
