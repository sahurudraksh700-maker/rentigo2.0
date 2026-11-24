import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatIsoDate, parseIsoDate, todayIsoDate } from '../utils/dates';

interface AvailabilityCalendarProps {
  availableFrom: string;
  availableTo: string;
  bookedDates: string[];
  selectedStart?: string;
  selectedEnd?: string;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function AvailabilityCalendar({
  availableFrom,
  availableTo,
  bookedDates,
  selectedStart,
  selectedEnd,
}: AvailabilityCalendarProps) {
  const initialMonth = useMemo(() => {
    const base = todayIsoDate() > availableFrom ? todayIsoDate() : availableFrom;
    const d = parseIsoDate(base);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }, [availableFrom]);

  const [viewMonth, setViewMonth] = useState<Date>(initialMonth);
  const bookedSet = useMemo(() => new Set(bookedDates), [bookedDates]);
  const today = todayIsoDate();

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthTitle = viewMonth.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(formatIsoDate(new Date(year, month, d)));
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f1b] p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-900 dark:text-[#eceff4]">
          {monthTitle}
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setViewMonth(new Date(year, month - 1, 1))}
            aria-label="Previous month"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMonth(new Date(year, month + 1, 1))}
            aria-label="Next month"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-2">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 tabular-nums text-xs">
        {cells.map((iso, idx) => {
          if (!iso) return <div key={`empty_${idx}`} className="h-9" />;
          const dayNum = Number(iso.slice(8, 10));
          const isPast = iso < today;
          const isOutside = iso < availableFrom || iso > availableTo;
          const isBooked = bookedSet.has(iso);
          const isSelected =
            selectedStart &&
            selectedEnd &&
            iso >= selectedStart &&
            iso <= selectedEnd;

          let cellClass =
            'h-9 flex items-center justify-center rounded-lg border text-xs transition-colors ';
          if (isBooked) {
            cellClass +=
              'border-[#e63f24]/30 bg-[#e63f24]/15 text-[#e63f24] line-through';
          } else if (isSelected) {
            cellClass +=
              'border-[#e63f24] bg-[#e63f24] text-white font-medium';
          } else if (isPast || isOutside) {
            cellClass +=
              'border-transparent text-slate-300 dark:text-slate-700';
          } else {
            cellClass +=
              'border-slate-100 dark:border-slate-800/70 text-slate-800 dark:text-slate-200 bg-slate-50/70 dark:bg-slate-900/40';
          }

          return (
            <div
              key={iso}
              title={
                isBooked
                  ? 'Already booked'
                  : isOutside
                    ? 'Outside owner availability'
                    : 'Available'
              }
              className={cellClass}
            >
              {dayNum}
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900" />
          Available
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border border-[#e63f24]/40 bg-[#e63f24]/20" />
          Booked
        </span>
      </div>
    </div>
  );
}
