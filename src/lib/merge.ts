import { deriveId, isSameThing } from "./id";
import type { Entry } from "./schema";

export const ANNOUNCEMENT_LOOKBACK_DAYS = 60;
export const EVENT_LOOKAHEAD_MONTHS = 12;

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function addMonths(date: string, months: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  const target = d.getUTCMonth() + months;
  const anchor = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(target);
  const lastOfMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(anchor, lastOfMonth));
  return d.toISOString().slice(0, 10);
}

/**
 * The window the calendar keeps: `lookback` days of announcements behind today,
 * 12 months of scheduled events ahead. Events inside the lookback window stay
 * too — a conference that ran last week is still worth seeing.
 */
export function windowFor(today: string) {
  return {
    from: addDays(today, -ANNOUNCEMENT_LOOKBACK_DAYS),
    to: addMonths(today, EVENT_LOOKAHEAD_MONTHS),
  };
}

export function inWindow(entry: Entry, today: string): boolean {
  const { from, to } = windowFor(today);
  const end = entry.endDate ?? entry.date;
  return end >= from && entry.date <= to;
}

/**
 * Merge one incoming entry into an existing one representing the same thing.
 * Incoming wins on mutable facts (date, status, summary); provenance is
 * accumulated, never replaced, and firstSeen is never moved forward.
 */
export function mergeEntry(existing: Entry, incoming: Entry): Entry {
  const seenUrls = new Set(existing.sources.map((s) => s.url));
  const sources = [...existing.sources];
  for (const s of incoming.sources) {
    if (!seenUrls.has(s.url)) {
      seenUrls.add(s.url);
      sources.push(s);
    }
  }

  return {
    ...existing,
    date: incoming.date,
    endDate: incoming.endDate,
    datePrecision: incoming.datePrecision,
    title: incoming.title,
    summary: incoming.summary,
    topics: [...new Set([...existing.topics, ...incoming.topics])],
    location: incoming.location ?? existing.location,
    confidence: incoming.confidence,
    status: incoming.status,
    sources,
    firstSeen: existing.firstSeen < incoming.firstSeen ? existing.firstSeen : incoming.firstSeen,
    lastVerified:
      existing.lastVerified > incoming.lastVerified ? existing.lastVerified : incoming.lastVerified,
  };
}

export type MergeResult = {
  entries: Entry[];
  added: string[];
  updated: string[];
  pruned: string[];
};

/**
 * Fold a day's findings into the existing corpus: match by id first, then by
 * loose dedupe key, then append. Finally drop anything outside the window.
 */
export function mergeAll(existing: Entry[], incoming: Entry[], today: string): MergeResult {
  const byId = new Map<string, Entry>();
  for (const e of existing) byId.set(e.id, e);

  const added: string[] = [];
  const updated: string[] = [];

  for (const raw of incoming) {
    const candidate: Entry = { ...raw, id: raw.id || deriveId(raw) };

    // Match on the id first, then on identity-plus-date-tolerance, so an event
    // that slipped a few days — or came back under a differently spelled org —
    // updates in place instead of being filed twice. A linear scan, because
    // identity now turns on token overlap rather than one exact key; the corpus
    // is a few hundred entries and a day's findings a few dozen.
    let matchId = byId.has(candidate.id) ? candidate.id : undefined;
    if (!matchId) {
      for (const [id, existingEntry] of byId) {
        if (isSameThing(existingEntry, candidate)) {
          matchId = id;
          break;
        }
      }
    }

    if (matchId) {
      const before = byId.get(matchId)!;
      const merged = mergeEntry(before, candidate);
      byId.set(matchId, merged);
      if (JSON.stringify(before) !== JSON.stringify(merged)) updated.push(matchId);
    } else {
      byId.set(candidate.id, candidate);
      added.push(candidate.id);
    }
  }

  const pruned: string[] = [];
  const entries: Entry[] = [];
  for (const e of byId.values()) {
    if (inWindow(e, today)) entries.push(e);
    else pruned.push(e.id);
  }

  entries.sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date)));
  return { entries, added, updated, pruned };
}

/** Split a flat corpus back into the per-month files on disk. */
export function groupByMonth(entries: Entry[]): Map<string, Entry[]> {
  const out = new Map<string, Entry[]>();
  for (const e of entries) {
    const k = monthKey(e.date);
    if (!out.has(k)) out.set(k, []);
    out.get(k)!.push(e);
  }
  for (const list of out.values()) {
    list.sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date)));
  }
  return new Map([...out.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}
