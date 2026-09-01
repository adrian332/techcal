import { entryEnd } from "./calendar";
import type { Entry, Kind, Topic } from "./schema";

export type Filters = {
  topics?: Topic[];
  kinds?: Kind[];
  confidence?: Entry["confidence"][];
  search?: string;
};

/**
 * Joins punctuation-split words so "re:Invent" is findable as "reinvent",
 * "Node.js" as "nodejs" and ".NET" as "net". Indexed alongside the raw text,
 * so both "invent" and "reinvent" hit.
 */
export function squash(text: string): string {
  return text.replace(/[.:''&/\-]+/g, "");
}

/**
 * A query term is punctuation-stripped rather than split on it, so typing
 * "re:Invent" or "Node.js" searches for the joined form the index also holds.
 */
export function queryTerms(search: string): string[] {
  return search
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]+/g, ""))
    .filter(Boolean);
}

/** Every word an entry is findable by, in both its raw and squashed spelling. */
export function entryTokens(entry: Entry): string[] {
  const text = `${entry.title} ${entry.summary} ${entry.org} ${entry.location ?? ""} ${entry.topics.join(" ")}`.toLowerCase();
  const words = (s: string) => s.split(/[^a-z0-9]+/).filter(Boolean);
  return [...new Set([...words(text), ...words(squash(text))])];
}

/** Terms are ANDed and each matches on a prefix, so search narrows as you type. */
export function matchesSearch(entry: Entry, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const tokens = entryTokens(entry);
  return terms.every((term) => tokens.some((token) => token.startsWith(term)));
}

export function matchesFilters(entry: Entry, filters: Filters, terms = queryTerms(filters.search ?? "")): boolean {
  if (entry.status === "superseded") return false;
  if (filters.kinds?.length && !filters.kinds.includes(entry.kind)) return false;
  if (filters.confidence?.length && !filters.confidence.includes(entry.confidence)) return false;
  if (filters.topics?.length && !filters.topics.some((t) => entry.topics.includes(t))) return false;
  return matchesSearch(entry, terms);
}

function byDateThenTitle(a: Entry, b: Entry): number {
  return a.date === b.date ? a.title.localeCompare(b.title) : a.date.localeCompare(b.date);
}

function select(entries: Entry[], filters: Filters, extra: (e: Entry) => boolean): Entry[] {
  const terms = queryTerms(filters.search ?? "");
  return entries.filter((e) => extra(e) && matchesFilters(e, filters, terms)).sort(byDateThenTitle);
}

/** Entries overlapping [from, to] inclusive, honouring filters. */
export function selectInRange(entries: Entry[], from: string, to: string, filters: Filters = {}): Entry[] {
  return select(entries, filters, (e) => entryEnd(e) >= from && e.date <= to);
}

/** The next `limit` entries from `from`, including ones already under way. */
export function selectUpcoming(entries: Entry[], from: string, limit: number, filters: Filters = {}): Entry[] {
  return select(entries, filters, (e) => entryEnd(e) >= from).slice(0, limit);
}

/** Superseded entries stay addressable by id — only the calendar hides them. */
export function selectById(entries: Entry[], id: string): Entry | null {
  return entries.find((e) => e.id === id) ?? null;
}

export function counts(entries: Entry[]): { total: number; events: number; announcements: number } {
  const live = entries.filter((e) => e.status !== "superseded");
  return {
    total: live.length,
    events: live.filter((e) => e.kind === "event").length,
    announcements: live.filter((e) => e.kind === "announcement").length,
  };
}
