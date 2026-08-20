import type { Filters } from "./query";
import { CONFIDENCE, KINDS, TOPICS, type Entry, type Kind, type Topic } from "./schema";

export type SearchParams = Record<string, string | string[] | undefined>;

function list(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : [value];
  return raw.flatMap((v) => v.split(",")).map((v) => v.trim()).filter(Boolean);
}

/** Unknown values in the URL are dropped rather than erroring the page. */
export function parseFilters(params: SearchParams): Filters {
  const topics = list(params.topic).filter((t): t is Topic => (TOPICS as readonly string[]).includes(t));
  const kinds = list(params.kind).filter((k): k is Kind => (KINDS as readonly string[]).includes(k));
  const confidence = list(params.confidence).filter((c): c is Entry["confidence"] =>
    (CONFIDENCE as readonly string[]).includes(c),
  );
  const search = typeof params.q === "string" ? params.q.trim() : "";

  return {
    ...(topics.length ? { topics } : {}),
    ...(kinds.length ? { kinds } : {}),
    ...(confidence.length ? { confidence } : {}),
    ...(search ? { search } : {}),
  };
}

export function isFiltered(filters: Filters): boolean {
  return Boolean(filters.topics?.length || filters.kinds?.length || filters.confidence?.length || filters.search);
}

/** Rebuild the query string with one key toggled, so filters are plain links. */
export function toggleParam(params: SearchParams, key: string, value: string): string {
  const current = new Set(list(params[key]));
  if (current.has(value)) current.delete(value);
  else current.add(value);

  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    // Changing a filter closes whatever the sidebar was showing — the day or
    // entry may no longer match the narrowed view.
    if (k === key || k === "day" || k === "entry") continue;
    for (const item of list(v)) next.append(k, item);
  }
  for (const item of current) next.append(key, item);

  const qs = next.toString();
  return qs ? `?${qs}` : "";
}

export function withParam(params: SearchParams, key: string, value: string | null): string {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (k === key) continue;
    for (const item of list(v)) next.append(k, item);
  }
  if (value) next.append(key, value);
  const qs = next.toString();
  return qs ? `?${qs}` : "";
}
