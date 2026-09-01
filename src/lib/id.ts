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

/** Legal and event wrappers that say nothing about which organisation this is. */
const ORG_NOISE = new Set([
  "the", "inc", "llc", "ltd", "plc", "corp", "corporation", "company", "co", "group",
  "holdings", "foundation", "association", "institute", "society", "consortium",
  "conference", "conf", "summit", "events", "event", "org", "team", "project",
]);

/** Filler that carries no identity in a title. */
const TITLE_NOISE = new Set([
  "the", "a", "an", "and", "or", "of", "for", "to", "in", "on", "at", "its", "new",
  "announces", "announced", "announcement", "launch", "launches", "launched",
  "release", "releases", "released", "event",
]);

function tokens(text: string): string[] {
  return slugify(text).split("-").filter(Boolean);
}

/** The acronym reading of a multi-word name: "Consumer Technology Association" -> "cta". */
export function acronym(text: string): string {
  const words = tokens(text);
  return words.length >= 2 ? words.map((w) => w[0]).join("") : "";
}

/** The words that actually name an organisation, wrappers stripped. */
export function orgTokens(org: string): Set<string> {
  const all = tokens(org);
  const meaningful = all.filter((w) => !ORG_NOISE.has(w));
  // An org that is nothing but wrappers keeps them; better a weak key than none.
  return new Set(meaningful.length ? meaningful : all);
}

/**
 * Two spellings of the same organisation. The routine records whatever a source
 * called it, so one run files "NeurIPS" and the next "NeurIPS Foundation", or
 * "CTA" against "Consumer Technology Association" — different strings, one body,
 * and previously two entries side by side on the calendar.
 *
 * Deliberately generous: this only nominates a candidate, and the title and date
 * still have to agree before anything merges.
 */
export function sameOrg(a: string, b: string): boolean {
  const ta = orgTokens(a);
  const tb = orgTokens(b);
  for (const token of ta) if (tb.has(token)) return true;

  const acronymA = acronym(a);
  const acronymB = acronym(b);
  return (Boolean(acronymA) && tb.has(acronymA)) || (Boolean(acronymB) && ta.has(acronymB));
}

/**
 * What a title says beyond restating its organisation. Titles routinely repeat
 * the org ("NeurIPS 2026", "RSA Conference 2027"), so comparing raw titles makes
 * a name written two ways look like two different things.
 */
export function titleTokens(title: string, org: string): Set<string> {
  const orgWords = new Set([...orgTokens(org), ...tokens(org), acronym(org)].filter(Boolean));
  const meaningful = tokens(title).filter((w) => !TITLE_NOISE.has(w));
  const distinctive = meaningful.filter((w) => !orgWords.has(w));
  // A title that is purely the org name falls back to itself rather than empty.
  return new Set(distinctive.length ? distinctive : meaningful);
}

function sameTitle(ta: Set<string>, tb: Set<string>): boolean {
  if (!ta.size || !tb.size) return false;

  const shared = [...ta].filter((t) => tb.has(t)).length;
  const union = ta.size + tb.size - shared;
  // Either one title says everything the other does — a fuller spelling of the
  // same name — or they agree on most of what they both say. The 0.6 floor is
  // what keeps two CISA KEV deadlines apart: they share "kev remediation
  // deadline cve" and differ only on the product, which lands around 0.43.
  return shared === Math.min(ta.size, tb.size) || shared / union >= 0.6;
}

/** How far a scheduled event may move and still be considered the same event. */
export const EVENT_DRIFT_DAYS = 75;

const MONTH_WORDS = new Set([
  "january", "february", "march", "april", "may", "june", "july", "august",
  "september", "october", "november", "december",
  "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sept", "sep", "oct", "nov", "dec",
]);

function yearsIn(tokenSet: Set<string>): string[] {
  return [...tokenSet].filter((w) => /^(19|20)\d{2}$/.test(w));
}

function namesAMonth(tokenSet: Set<string>): boolean {
  return [...tokenSet].some((w) => MONTH_WORDS.has(w));
}

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
  if (a.kind !== b.kind) return false;
  if (!sameOrg(a.org, b.org)) return false;

  const ta = titleTokens(a.title, a.org);
  const tb = titleTokens(b.title, b.org);
  if (!sameTitle(ta, tb)) return false;

  if (a.kind === "announcement") return a.date === b.date;

  // A title naming its own edition settles the question before drift gets a
  // say. Without this the drift window — 2.5 months — is longer than a monthly
  // recurrence, so September's Patch Tuesday swallows November's: same org,
  // titles overlapping on everything but the month, 63 days apart.
  const [yearsA, yearsB] = [yearsIn(ta), yearsIn(tb)];
  if (yearsA.length && yearsB.length && !yearsA.some((y) => yearsB.includes(y))) return false;
  if (namesAMonth(ta) || namesAMonth(tb)) return a.date.slice(0, 7) === b.date.slice(0, 7);

  return daysApart(a.date, b.date) <= EVENT_DRIFT_DAYS;
}
