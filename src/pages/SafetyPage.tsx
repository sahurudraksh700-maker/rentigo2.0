import { Camera, CheckCircle2, Flag, MapPin, PhoneCall, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../utils/seo';

const HANDOVER_STEPS = [
  {
    icon: MapPin,
    title: 'Meet on campus',
    description:
      'Pick a bright, familiar campus spot like the Central Library steps, Hostel 4 lobby, or Student Activity Centre during daytime hours.',
  },
  {
    icon: CheckCircle2,
    title: 'Check the item together',
    description:
      'Power on cameras, projectors, or audio gear on the spot. Verify lenses, chargers, cables, buttons, brakes, or garment zippers before confirming pickup.',
  },
  {
    icon: Camera,
    title: 'Log pickup & return photos',
    description:
      'Complete the Rentigo pickup and return checklists with 2–3 photos so security deposits stay fair, transparent, and backed by evidence.',
  },
];

const CHECKLIST = [
  'Check the lender or renter has the Verified student badge (.edu/.ac.in email or approved campus ID).',
  'Keep all pre-booking chat inside Rentigo — phone numbers and external links are hidden until a booking is Accepted.',
  'Agree clearly on return date, exact campus pickup spot, and daily late fee rate before handover.',
  'Never hand over original government IDs or bank PINs — all deposits stay recorded inside Rentigo.',
  'If anything arrives damaged or a dispute arises, press the Dispute button in your Dashboard to attach handover photos directly for admin review.',
];

const EMERGENCY_CONTACTS = [
  { label: 'National Emergency Helpline', value: '112' },
  { label: 'Cyber Crime & Financial Fraud', value: '1930' },
  { label: 'Campus Main Gate Security (24×7)', value: 'Check Hostel / Campus ID Card Desk' },
  { label: 'Rentigo Official Campus Support', value: 'rentigo.campus@gmail.com' },
];

export function SafetyPage() {
  usePageMeta({
    title: 'Campus Safety & Meetup Guide — Rentigo',
    description:
      'Meetup checklist, handover photo protocol, deposit protection, and emergency contacts for safe peer-to-peer rentals on campus.',
  });

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      <div>
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#e63f24]">
          <ShieldCheck className="w-4 h-4" />
          <span>Campus Handover Protocol</span>
        </div>
        <h1 className="mt-2 text-3xl sm:text-5xl font-normal tracking-tight text-slate-950 dark:text-[#eceff4]">
          Safe rentals start at the library steps.
        </h1>
        <p className="mt-3 text-base text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
          Rentigo connects verified classmates across your college network. Follow these three habits on every pickup and return so deposits stay smooth and gear stays protected.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {HANDOVER_STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <div
              key={step.title}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#e63f24]/10 text-[#e63f24] flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-slate-400 tabular-nums">
                  0{index + 1}
                </span>
              </div>
              <h2 className="text-lg font-medium text-slate-950 dark:text-white">
                {step.title}
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {step.description}
              </p>
            </div>
          );
        })}
      </div>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-6 sm:p-8">
        <h2 className="text-xl font-medium text-slate-950 dark:text-white">
          Campus meetup checklist
        </h2>
        <ul className="mt-4 space-y-3">
          {CHECKLIST.map((point) => (
            <li
              key={point}
              className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300"
            >
              <CheckCircle2 className="w-4 h-4 text-[#e63f24] mt-0.5 shrink-0" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-6 sm:p-8">
        <div className="flex items-center gap-2 text-base font-medium text-slate-950 dark:text-white">
          <PhoneCall className="w-4 h-4 text-[#e63f24]" />
          <h2>Emergency &amp; Escalation Contacts</h2>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {EMERGENCY_CONTACTS.map((c) => (
            <div
              key={c.label}
              className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#070a12] p-3.5"
            >
              <div className="text-xs text-slate-500 dark:text-slate-400">{c.label}</div>
              <div className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">
                {c.value}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0b0f1b] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-medium text-slate-950 dark:text-white">
            Spot a suspicious listing or booking dispute?
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Report any listing, message, review, or user — listings with 3 reports are auto-hidden immediately.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            to="/browse?report=1"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-800 dark:text-slate-200 hover:border-[#e63f24] transition-colors"
          >
            <Flag className="w-4 h-4 text-[#e63f24]" />
            <span>Report a Listing</span>
          </Link>
          <Link
            to="/browse"
            className="px-5 py-2.5 rounded-xl bg-[#e63f24] hover:bg-[#cc3118] text-white text-sm font-medium transition-colors"
          >
            Browse Rentals
          </Link>
        </div>
      </div>
    </main>
  );
}
