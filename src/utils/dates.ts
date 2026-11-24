export function parseIsoDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayIsoDate(): string {
  return formatIsoDate(new Date());
}

export function addDaysIsoDate(dateStr: string, offsetDays: number): string {
  const d = parseIsoDate(dateStr);
  d.setDate(d.getDate() + offsetDays);
  return formatIsoDate(d);
}

export function countInclusiveDays(startDate: string, endDate: string): number {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / 86400000) + 1;
}

export function datesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export function expandDateRange(startDate: string, endDate: string): string[] {
  const out: string[] = [];
  const cur = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  let guard = 0;
  while (cur <= end && guard < 180) {
    out.push(formatIsoDate(cur));
    cur.setDate(cur.getDate() + 1);
    guard++;
  }
  return out;
}

export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = parseIsoDate(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatMemberSince(isoStr: string): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  });
}

export function formatRelativeTime(isoStr: string): string {
  if (!isoStr) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(isoStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}
