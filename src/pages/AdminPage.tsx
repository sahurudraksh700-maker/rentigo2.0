import {
  BadgeCheck,
  BookOpen,
  Flag,
  LifeBuoy,
  Shield,
  Trash2,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { faqService } from '../services/faqService';
import { listingsService } from '../services/listingsService';
import { moderationService } from '../services/moderationService';
import { paymentsService } from '../services/paymentsService';
import { requestsService } from '../services/requestsService';
import { usersService } from '../services/usersService';
import { verificationsService } from '../services/verificationsService';
import type {
  FaqEntry,
  Listing,
  ModerationReport,
  PlatformSettings,
  SupportTicket,
  UserProfile,
  VerificationRequest,
} from '../types/rentigo';
import { formatRelativeTime } from '../utils/dates';
import { usePageMeta } from '../utils/seo';

type AdminTab = 'reports' | 'verifications' | 'tickets' | 'users' | 'faqs';

export function AdminPage() {
  const { user, openSignIn, refreshUsers } = useAuth();
  const { showToast } = useToast();

  usePageMeta({ title: 'Campus Moderation & Admin — Rentigo' });

  const [tab, setTab] = useState<AdminTab>('reports');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [faqs, setFaqs] = useState<FaqEntry[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [gmv, setGmv] = useState(0);
  const [requestCount, setRequestCount] = useState(0);

  // FAQ form
  const [faqQ, setFaqQ] = useState('');
  const [faqA, setFaqA] = useState('');
  const [faqKw, setFaqKw] = useState('');
  const [faqCat, setFaqCat] = useState('General');
  const [editingFaqId, setEditingFaqId] = useState<string | undefined>(undefined);

  const loadAdminData = useCallback(async () => {
    const [u, l, rep, ver, tkt, fq, st, reqs, pays] = await Promise.all([
      usersService.listUsers(),
      listingsService.listAllIncludingHidden(),
      moderationService.listReports(),
      verificationsService.listAll(),
      moderationService.listSupportTickets(),
      faqService.listFaqs(),
      faqService.getPlatformSettings(),
      requestsService.listAll(),
      paymentsService.listAll(),
    ]);
    setUsers(u);
    setListings(l);
    setReports(rep);
    setVerifications(ver);
    setTickets(tkt);
    setFaqs(fq);
    setSettings(st);
    setRequestCount(reqs.length);
    setGmv(
      pays.reduce((acc, p) => acc + p.amountPaid, 0) +
        reqs
          .filter((r) => !r.paymentId && r.status !== 'Cancelled' && r.status !== 'Declined')
          .reduce((acc, r) => acc + r.totalAmount, 0),
    );
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  if (!user) {
    return (
      <main className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-8">
          <Shield className="w-8 h-8 text-[#e63f24] mx-auto mb-3" />
          <h1 className="text-2xl font-normal">Admin Moderation Panel</h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in with your administrator account (sahurudraksh700@gmail.com) to manage reports, student ID verifications, and disputes.
          </p>
          <button
            type="button"
            onClick={() => openSignIn('/admin')}
            className="mt-6 px-5 py-2.5 rounded-xl bg-[#e63f24] text-white text-sm font-medium"
          >
            Sign in with Google
          </button>
        </div>
      </main>
    );
  }

  if (user.role !== 'admin') {
    return (
      <main className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-8">
          <Shield className="w-8 h-8 text-[#e63f24] mx-auto mb-3" />
          <h1 className="text-xl font-medium">Admin access required</h1>
          <p className="mt-2 text-sm text-slate-500">
            Your current account ({user.email}) has student permissions. Switch to Rudraksh Sahu (sahurudraksh700@gmail.com) in Sign-in to access /admin.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => openSignIn('/admin')}
              className="px-5 py-2.5 rounded-xl bg-[#e63f24] text-white text-sm font-medium"
            >
              Switch to Admin Account
            </button>
            <Link
              to="/browse"
              className="inline-flex px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-medium"
            >
              Back to Browse
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const usersById = new Map(users.map((u) => [u.id, u]));
  const pendingReports = reports.filter((r) => r.status === 'pending').length;
  const pendingVerifs = verifications.filter((v) => v.status === 'pending').length;
  const openTickets = tickets.filter((t) => t.status !== 'resolved').length;

  const handleResolveReport = async (
    reportId: string,
    action: 'dismiss' | 'remove_listing' | 'ban_user',
  ) => {
    try {
      await moderationService.resolveReport(reportId, user.id, action);
      showToast('Moderation action applied', 'success');
      await loadAdminData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Action failed', 'error');
    }
  };

  const handleVerificationDecision = async (verId: string, approve: boolean) => {
    try {
      await verificationsService.reviewVerification(
        verId,
        user.id,
        approve,
        approve ? undefined : 'Card details did not match profile.',
      );
      await refreshUsers();
      await loadAdminData();
      showToast(approve ? 'Student ID approved' : 'Student ID rejected', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Review failed', 'error');
    }
  };

  const handleSaveFaq = async (e: FormEvent) => {
    e.preventDefault();
    if (!faqQ.trim() || !faqA.trim()) return;
    await faqService.upsertFaq({
      id: editingFaqId,
      question: faqQ,
      answer: faqA,
      keywords: faqKw.split(','),
      category: faqCat,
    });
    setFaqQ('');
    setFaqA('');
    setFaqKw('');
    setEditingFaqId(undefined);
    showToast('Chatbot FAQ saved', 'success');
    await loadAdminData();
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#e63f24]">
            Campus Governance
          </p>
          <h1 className="mt-1 text-3xl font-normal text-slate-950 dark:text-white">
            Rentigo Admin Panel
          </h1>
        </div>
        {settings && (
          <label className="inline-flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] px-4 py-2.5 text-xs font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={settings.requireVerificationToTransact}
              onChange={async (e) => {
                await faqService.updatePlatformSettings(user.id, {
                  requireVerificationToTransact: e.target.checked,
                });
                await loadAdminData();
                showToast('Verification policy updated', 'info');
              }}
              className="accent-[#e63f24]"
            />
            <span>Require student verification to list or request</span>
          </label>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 tabular-nums">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-4">
          <div className="text-xs text-slate-500">Users / Listings</div>
          <div className="mt-1 text-2xl font-semibold">
            {users.length} / {listings.length}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-4">
          <div className="text-xs text-slate-500">Total Requests</div>
          <div className="mt-1 text-2xl font-semibold">{requestCount}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-4">
          <div className="text-xs text-slate-500">Test GMV Volume</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
            ₹{gmv.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-4">
          <div className="text-xs text-slate-500">Action Queues</div>
          <div className="mt-1 text-sm font-medium">
            {pendingReports} reports · {pendingVerifs} IDs · {openTickets} tickets
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-6 overflow-x-auto">
        {(
          [
            { id: 'reports', label: `Reports (${pendingReports})`, Icon: Flag },
            { id: 'verifications', label: `ID Verifications (${pendingVerifs})`, Icon: BadgeCheck },
            { id: 'tickets', label: `Disputes & Support (${openTickets})`, Icon: LifeBuoy },
            { id: 'users', label: `Users & Listings`, Icon: Users },
            { id: 'faqs', label: `Chatbot FAQs (${faqs.length})`, Icon: BookOpen },
          ] as const
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`pb-3 text-sm font-medium border-b-2 whitespace-nowrap inline-flex items-center gap-1.5 transition-colors ${
              tab === id
                ? 'border-[#e63f24] text-[#e63f24]'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {tab === 'reports' && (
        <div className="space-y-3">
          {reports.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-10 text-center text-sm text-slate-500">
              No reports in the moderation queue.
            </div>
          ) : (
            reports.map((rep) => (
              <div
                key={rep.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold uppercase">
                      {rep.targetType}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-medium ${
                        rep.status === 'pending'
                          ? 'bg-[#e63f24]/15 text-[#e63f24]'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {rep.status}
                    </span>
                    <span className="text-slate-400">{formatRelativeTime(rep.createdAt)}</span>
                  </div>
                  <div className="text-sm font-medium">{rep.reason}</div>
                  <div className="text-xs text-slate-500">
                    Target: {rep.targetId} · Reporter:{' '}
                    {usersById.get(rep.reporterId)?.name ?? rep.reporterId}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{rep.details}</p>
                </div>

                {rep.status === 'pending' && (
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleResolveReport(rep.id, 'dismiss')}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium"
                    >
                      Dismiss
                    </button>
                    {rep.listingId && (
                      <button
                        type="button"
                        onClick={() => handleResolveReport(rep.id, 'remove_listing')}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-medium"
                      >
                        Hide Listing
                      </button>
                    )}
                    {rep.targetUserId && (
                      <button
                        type="button"
                        onClick={() => handleResolveReport(rep.id, 'ban_user')}
                        className="px-3 py-1.5 rounded-lg bg-[#e63f24] text-white text-xs font-medium"
                      >
                        Ban User
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'verifications' && (
        <div className="space-y-3">
          {verifications.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-10 text-center text-sm text-slate-500">
              No student ID submissions yet.
            </div>
          ) : (
            verifications.map((ver) => {
              const applicant = usersById.get(ver.userId);
              return (
                <div
                  key={ver.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    {ver.idPhotoUrl && (
                      <img
                        src={ver.idPhotoUrl}
                        alt="Student ID"
                        className="w-24 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-800"
                      />
                    )}
                    <div>
                      <div className="text-sm font-medium">
                        {applicant?.name ?? ver.userId} ({ver.method})
                      </div>
                      <div className="text-xs text-slate-500">
                        {ver.collegeEmail || `Roll / ID: ${ver.studentIdNumber}`} · Status:{' '}
                        <strong className="uppercase">{ver.status}</strong>
                      </div>
                    </div>
                  </div>

                  {ver.status === 'pending' && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleVerificationDecision(ver.id, false)}
                        className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-[#e63f24]"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVerificationDecision(ver.id, true)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-medium"
                      >
                        Approve ID
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'tickets' && (
        <div className="space-y-3">
          {tickets.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-10 text-center text-sm text-slate-500">
              No support tickets or booking disputes right now.
            </div>
          ) : (
            tickets.map((tkt) => (
              <div
                key={tkt.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-5 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold uppercase mr-2">
                      {tkt.type}
                    </span>
                    <span className="text-sm font-semibold">{tkt.subject}</span>
                  </div>
                  <span className="text-xs font-medium uppercase text-[#e63f24]">
                    {tkt.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">{tkt.description}</p>
                {tkt.attachments?.checklistSummary && (
                  <div className="rounded-xl bg-slate-50 dark:bg-[#070a12] p-3 text-xs text-slate-500">
                    <strong>Handover Evidence:</strong> {tkt.attachments.checklistSummary}
                  </div>
                )}
                {tkt.attachments && tkt.attachments.photos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tkt.attachments.photos.map((p, idx) => (
                      <img
                        key={idx}
                        src={p}
                        alt={`Dispute evidence ${idx + 1}`}
                        className="w-16 h-16 rounded-lg object-cover border border-slate-200 dark:border-slate-800"
                      />
                    ))}
                  </div>
                )}
                {tkt.status !== 'resolved' && (
                  <div className="flex justify-end gap-2">
                    {tkt.status === 'open' && (
                      <button
                        type="button"
                        onClick={async () => {
                          await moderationService.updateTicketStatus(
                            tkt.id,
                            user.id,
                            'in_review',
                          );
                          await loadAdminData();
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium"
                      >
                        Mark In Review
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        await moderationService.updateTicketStatus(
                          tkt.id,
                          user.id,
                          'resolved',
                          'Reviewed by Rentigo campus admin.',
                        );
                        showToast('Ticket marked resolved', 'success');
                        await loadAdminData();
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium"
                    >
                      Resolve Ticket
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] divide-y divide-slate-100 dark:divide-slate-800">
            <div className="px-5 py-3.5 font-medium text-sm">Students ({users.length})</div>
            {users.map((u) => (
              <div key={u.id} className="px-5 py-3 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <Link to={`/u/${u.id}`} className="font-medium hover:text-[#e63f24] truncate block">
                    {u.name} {u.role === 'admin' ? '(Admin)' : ''}
                  </Link>
                  <div className="text-slate-500 truncate">{u.email}</div>
                </div>
                {u.id !== user.id && (
                  <button
                    type="button"
                    onClick={async () => {
                      await moderationService.setUserBan(u.id, user.id, !u.isBanned);
                      await loadAdminData();
                    }}
                    className={`px-3 py-1.5 rounded-lg border font-medium shrink-0 ${
                      u.isBanned
                        ? 'border-emerald-500/40 text-emerald-600'
                        : 'border-[#e63f24]/40 text-[#e63f24]'
                    }`}
                  >
                    {u.isBanned ? 'Unban' : 'Ban'}
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] divide-y divide-slate-100 dark:divide-slate-800">
            <div className="px-5 py-3.5 font-medium text-sm">Listings ({listings.length})</div>
            {listings.map((l) => (
              <div key={l.id} className="px-5 py-3 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <Link
                    to={`/listing/${l.id}`}
                    className="font-medium hover:text-[#e63f24] truncate block"
                  >
                    {l.title}
                  </Link>
                  <div className="text-slate-500">
                    {l.college} · Reports: {l.reportCount}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await moderationService.setListingHidden(
                      l.id,
                      user.id,
                      !l.isHiddenByModeration,
                    );
                    await loadAdminData();
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 font-medium shrink-0"
                >
                  {l.isHiddenByModeration ? 'Restore' : 'Hide'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'faqs' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSaveFaq}
            className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-5 space-y-3 h-fit"
          >
            <h2 className="text-base font-medium">
              {editingFaqId ? 'Edit FAQ Entry' : 'Add Chatbot FAQ'}
            </h2>
            <input
              type="text"
              value={faqQ}
              onChange={(e) => setFaqQ(e.target.value)}
              placeholder="Question"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3 py-2 text-sm"
              required
            />
            <textarea
              rows={3}
              value={faqA}
              onChange={(e) => setFaqA(e.target.value)}
              placeholder="Answer shown by chatbot & /faq page"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3 py-2 text-sm"
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={faqCat}
                onChange={(e) => setFaqCat(e.target.value)}
                placeholder="Category"
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3 py-2 text-xs"
              />
              <input
                type="text"
                value={faqKw}
                onChange={(e) => setFaqKw(e.target.value)}
                placeholder="Keywords (comma separated)"
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] px-3 py-2 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2">
              {editingFaqId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingFaqId(undefined);
                    setFaqQ('');
                    setFaqA('');
                    setFaqKw('');
                  }}
                  className="px-3 py-2 text-xs text-slate-500"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#e63f24] text-white text-xs font-medium"
              >
                {editingFaqId ? 'Update FAQ' : 'Add FAQ'}
              </button>
            </div>
          </form>

          <div className="lg:col-span-7 space-y-3">
            {faqs.map((faq) => (
              <div
                key={faq.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-4 space-y-1.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-semibold text-[#e63f24] uppercase">
                      {faq.category}
                    </span>
                    <h3 className="text-sm font-medium">{faq.question}</h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingFaqId(faq.id);
                        setFaqQ(faq.question);
                        setFaqA(faq.answer);
                        setFaqCat(faq.category);
                        setFaqKw(faq.keywords.join(', '));
                      }}
                      className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-[#e63f24]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      aria-label="Delete FAQ"
                      onClick={async () => {
                        await faqService.deleteFaq(faq.id);
                        await loadAdminData();
                      }}
                      className="text-slate-400 hover:text-[#e63f24]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
