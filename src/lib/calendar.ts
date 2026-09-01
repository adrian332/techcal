import type { Entry } from "./schema";

export const WEEK_STARTS_ON = 1; // Monday

export function todayISO(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Today in the *viewer's* calendar, not UTC. Entry dates are plain calendar
 * days with no timezone, so a reader in Singapore should see 1 September as
 * "today" from midnight local — not from 08:00, when UTC finally agrees.
 */
export function localDayISO(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function monthOf(date: string): string {
  return date.slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/**
 * Month and weekday names are fixed rather than taken from Intl: ICU renames
 * September to "Sept" in some versions of en-GB, which would make the UI (and
 * these tests) drift with the Node build underneath it.
 */
export const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;
export const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
export const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export const WEEKDAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

export function monthLabelShort(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS_SHORT[m - 1]} ${String(y).slice(2)}`;
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function isoWeekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sunday
}

function shiftDay(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * The 6x7 (or 5x7) grid a month is drawn on, padded out to whole weeks so the
 * leading and trailing days of neighbouring months are visible.
 */
export function monthGrid(month: string): { days: string[]; weeks: string[][] } {
  const first = `${month}-01`;
  const lead = (isoWeekday(first) - WEEK_STARTS_ON + 7) % 7;
  const start = shiftDay(first, -lead);

  const total = lead + daysInMonth(month);
  const cells = Math.ceil(total / 7) * 7;

  const days = Array.from({ length: cells }, (_, i) => shiftDay(start, i));
  const weeks: string[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return { days, weeks };
}

export function entryEnd(entry: Entry): string {
  return entry.endDate ?? entry.date;
}

export function spansDay(entry: Entry, day: string): boolean {
  return entry.date <= day && entryEnd(entry) >= day;
}

export type Segment = {
  entry: Entry;
  /** 0-based column in the week where this segment starts. */
  column: number;
  /** How many columns it covers within this week. */
  span: number;
  lane: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
};

/**
 * Pack a week's entries into horizontal lanes, the way a Gantt row is packed:
 * each entry occupies the first lane where it does not collide. Multi-day
 * entries therefore draw as one continuous bar instead of repeating dots, and
 * a run of single-day items stacks underneath in stable order.
 */
export function packWeek(week: string[], entries: Entry[]): Segment[] {
  const weekStart = week[0];
  const weekEnd = week[week.length - 1];

  const relevant = entries
    .filter((e) => entryEnd(e) >= weekStart && e.date <= weekEnd)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      const spanA = week.indexOf(entryEnd(a)) - week.indexOf(a.date);
      const spanB = week.indexOf(entryEnd(b)) - week.indexOf(b.date);
      if (spanA !== spanB) return spanB - spanA; // longest bars on top
      return a.id.localeCompare(b.id);
    });

  const lanes: number[][] = []; // lane -> occupied column indices
  const segments: Segment[] = [];

  for (const entry of relevant) {
    const startDay = entry.date < weekStart ? weekStart : entry.date;
    const endDay = entryEnd(entry) > weekEnd ? weekEnd : entryEnd(entry);
    const column = week.indexOf(startDay);
    const span = week.indexOf(endDay) - column + 1;
    const columns = Array.from({ length: span }, (_, i) => column + i);

    let lane = lanes.findIndex((used) => columns.every((c) => !used.includes(c)));
    if (lane === -1) {
      lane = lanes.length;
      lanes.push([]);
    }
    lanes[lane].push(...columns);

    segments.push({
      entry,
      column,
      span,
      lane,
      continuesBefore: entry.date < weekStart,
      continuesAfter: entryEnd(entry) > weekEnd,
    });
  }

  return segments;
}

/** Per-month totals for the horizon ribbon: how busy each of the next N months is. */
export function densityByMonth(entries: Entry[], from: string, months: number): { month: string; count: number }[] {
  const counts = new Map<string, number>();
  for (let i = 0; i < months; i += 1) counts.set(shiftMonth(from, i), 0);
  for (const e of entries) {
    const key = monthOf(e.date);
    if (counts.has(key)) counts.set(key, counts.get(key)! + 1);
  }
  return [...counts.entries()].map(([month, count]) => ({ month, count }));
}

/** Compact gutter date for the agenda: "Tue 8 Sep". */
export function formatDayShort(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return `${WEEKDAYS_LONG[d.getUTCDay()].slice(0, 3)} ${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`;
}

export function formatDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return `${WEEKDAYS_LONG[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "8–10 Sep 2026" / "30 Nov – 4 Dec 2026" / "8 Sep 2026" */
function shortDate(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function formatRange(entry: Entry): string {
  const start = new Date(`${entry.date}T00:00:00Z`);
  const end = new Date(`${entryEnd(entry)}T00:00:00Z`);

  if (entry.datePrecision === "month") return monthLabel(entry.date.slice(0, 7));
  if (entry.datePrecision === "quarter") return `Q${Math.floor(start.getUTCMonth() / 3) + 1} ${start.getUTCFullYear()}`;
  if (!entry.endDate || entry.endDate === entry.date) return shortDate(start);

  const sameMonth = entry.date.slice(0, 7) === entryEnd(entry).slice(0, 7);
  const startText = sameMonth
    ? String(start.getUTCDate())
    : `${start.getUTCDate()} ${MONTHS_SHORT[start.getUTCMonth()]}`;
  return `${startText} – ${shortDate(end)}`;
}

/** "in 3 days" / "today" / "3 days ago" — relative to a given day, no clock involved. */
export function relativeDay(date: string, today: string, locale = "en-GB"): string {
  const diff = Math.round(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000,
  );
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (Math.abs(diff) < 31) return rtf.format(diff, "day");
  if (Math.abs(diff) < 365) return rtf.format(Math.round(diff / 30), "month");
  return rtf.format(Math.round(diff / 365), "year");
}
