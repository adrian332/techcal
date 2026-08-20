import type { Entry } from "./schema";

/** Lowercase kebab slug: strips accents, punctuation and stop-ish filler. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/**
 * Date bucket an entry is keyed by. Events are keyed by month so a keynote whose
 * exact day shifts (announced "Sept 9", moved to "Sept 10") keeps one identity;
 * announcements are keyed by their exact day, since the day IS the fact.
 */
export function dateBucket(kind: Entry["kind"], date: string): string {
  return kind === "announcement" ? date : date.slice(0, 7);
}

/**
 * Stable id: slug(org + title) + date bucket. Same real-world thing -> same id.
 * Titles usually already name the org ("AWS re:Invent"), so the org prefix is
 * only added when it is missing — otherwise every id reads "aws-aws-...".
 */
export function deriveId(input: Pick<Entry, "kind" | "org" | "title" | "date">): string {
  const org = slugify(input.org);
  const title = slugify(input.title);
  const base = org && !title.startsWith(org) ? `${org}-${title}` : title;
  return `${slugify(base)}-${dateBucket(input.kind, input.date)}`;
}

/**
 * Identity key with the date deliberately left out. A keynote that slips from
 * 30 Nov to 1 Dec would derive a different id, so matching on the id alone
 * would file it twice; the date is checked separately, with tolerance.
 */
export function dedupeKey(input: Pick<Entry, "kind" | "org" | "title">): string {
  const words = slugify(input.title).split("-").filter((w) => w.length > 3);
  words.sort();
  return `${input.kind}|${slugify(input.org)}|${words.join("-")}`;
}

/** How far a scheduled event may move and still be considered the same event. */
export const EVENT_DRIFT_DAYS = 75;

function daysApart(a: string, b: string): number {
  return Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000;
}

/**
 * Do these two describe the same real-world thing? An announcement is pinned to
 * its day — two similarly-titled OpenAI posts a week apart are two events. A
 * scheduled event may drift, but not by so much that next year's edition of a
 * conference swallows this year's.
 */
export function isSameThing(
  a: Pick<Entry, "kind" | "org" | "title" | "date">,
  b: Pick<Entry, "kind" | "org" | "title" | "date">,
): boolean {
  if (dedupeKey(a) !== dedupeKey(b)) return false;
  if (a.kind === "announcement") return a.date === b.date;
  return daysApart(a.date, b.date) <= EVENT_DRIFT_DAYS;
}
