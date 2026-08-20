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

/** Stable id: slug(org + title) + date bucket. Same real-world thing -> same id. */
export function deriveId(input: Pick<Entry, "kind" | "org" | "title" | "date">): string {
  const base = slugify(`${input.org} ${input.title}`);
  return `${base}-${dateBucket(input.kind, input.date)}`;
}

/** Loose key used to catch near-duplicates that derived a different id. */
export function dedupeKey(input: Pick<Entry, "kind" | "org" | "title" | "date">): string {
  const words = slugify(input.title).split("-").filter((w) => w.length > 3);
  words.sort();
  return `${slugify(input.org)}|${words.join("-")}|${dateBucket(input.kind, input.date)}`;
}
