import { BookOpen, FileText, Lock, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { faqService } from '../services/faqService';
import type { FaqEntry } from '../types/rentigo';
import { usePageMeta } from '../utils/seo';

export function FaqPage() {
  const [faqs, setFaqs] = useState<FaqEntry[]>([]);
  usePageMeta({
    title: 'Frequently Asked Questions — Rentigo',
    description: 'Answers about renting on campus, deposits, verification, late fees, and referral credits.',
  });

  useEffect(() => {
    faqService.listFaqs().then(setFaqs);
  }, []);

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#e63f24]">
          <BookOpen className="w-4 h-4" />
          <span>Help Center</span>
        </div>
        <h1 className="mt-2 text-3xl sm:text-4xl font-normal text-slate-950 dark:text-white">
          Frequently Asked Questions
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Need more help? Open the Help assistant bubble at the bottom right to ask questions or submit a support ticket.
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq) => (
          <article
            key={faq.id}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-6 space-y-2"
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#e63f24]">
              {faq.category}
            </div>
            <h2 className="text-lg font-medium text-slate-950 dark:text-white">
              {faq.question}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {faq.answer}
            </p>
          </article>
        ))}
      </div>
    </main>
  );
}

export function TermsPage() {
  usePageMeta({ title: 'Terms of Service — Rentigo' });

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-6">
      <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#e63f24]">
        <FileText className="w-4 h-4" />
        <span>Legal</span>
      </div>
      <h1 className="text-3xl font-normal text-slate-950 dark:text-white">
        Rentigo Terms of Service
      </h1>
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-6 sm:p-8 space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        <p>
          <strong>1. Peer-to-Peer Campus Platform:</strong> Rentigo connects college students within verified campus networks to rent everyday items from classmates. Owners retain full ownership of their items and set daily rental rates, security deposits, late fees, and cancellation policies upfront.
        </p>
        <p>
          <strong>2. Handover &amp; Care:</strong> Renters and owners must inspect the item together at pickup and complete the Rentigo handover checklist with photos. Renters agree to return items on time in the same working condition.
        </p>
        <p>
          <strong>3. Deposits &amp; Late Returns:</strong> Security deposits remain Held until the owner completes the return inspection. Partial deductions require documented handover evidence and a clear reason. Currently all checkout payments operate in TEST MODE without real financial charges.
        </p>
        <p>
          <strong>4. Prohibited Conduct:</strong> Off-platform harassment, fake student IDs, duplicate referral accounts, or listing illegal/dangerous items results in immediate account suspension.
        </p>
      </div>
    </main>
  );
}

export function PrivacyPage() {
  usePageMeta({ title: 'Privacy Policy — Rentigo' });

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-6">
      <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#e63f24]">
        <Lock className="w-4 h-4" />
        <span>Privacy</span>
      </div>
      <h1 className="text-3xl font-normal text-slate-950 dark:text-white">
        Rentigo Privacy Policy
      </h1>
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-6 sm:p-8 space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        <p>
          <strong>1. Campus Identity &amp; Phone Protection:</strong> Your phone / WhatsApp number is kept hidden from browsing users and unaccepted chat threads, and unlocks only after a booking is Accepted. You may also hide your last name publicly inside Settings.
        </p>
        <p>
          <strong>2. Local Data &amp; Export:</strong> In this edition, your profile, listings, bookings, messages, and receipts are stored locally in your browser. You can export a full JSON archive of your data or delete your account anytime from{' '}
          <Link to="/settings?tab=privacy" className="text-[#e63f24] hover:underline">
            Settings → Privacy &amp; Account
          </Link>
          .
        </p>
        <p>
          <strong>3. Verification Documents:</strong> College emails (.edu/.ac.in) and optional student ID photos are used solely to verify campus membership and display your Verified student badge.
        </p>
      </div>
    </main>
  );
}

export function GuidelinesPage() {
  usePageMeta({ title: 'Community Guidelines — Rentigo' });

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-6">
      <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#e63f24]">
        <ShieldCheck className="w-4 h-4" />
        <span>Community</span>
      </div>
      <h1 className="text-3xl font-normal text-slate-950 dark:text-white">
        Campus Community Guidelines
      </h1>
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-6 sm:p-8 space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        <p>
          <strong>Be punctual &amp; honest:</strong> Photograph actual gear condition, arrive on time at campus meetup points, and flag any existing wear before handover.
        </p>
        <p>
          <strong>Keep chat respectful:</strong> Use Rentigo messages for coordination. Listings receiving 3 moderation reports are hidden automatically pending review.
        </p>
        <p>
          <strong>No prohibited items:</strong> Weapons, hazardous materials, prescription medication, stolen goods, and exam cheating devices are strictly forbidden on Rentigo.
        </p>
      </div>
    </main>
  );
}
