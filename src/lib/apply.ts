import { z } from "zod";
import { deriveId } from "./id";
import { mergeAll } from "./merge";
import { entrySchema, runLogSchema, sourceSchema, type Entry, type RunLog } from "./schema";
import { CONFIDENCE, KINDS, PRECISION, TOPICS } from "./schema";

/**
 * What a research run hands over. Ids, provenance dates and status are derived
 * here rather than asked of the agent — those are bookkeeping, and bookkeeping
 * done by hand is bookkeeping done wrong.
 */
export const findingSchema = z
  .object({
    kind: z.enum(KINDS),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
    datePrecision: z.enum(PRECISION).optional(),
    title: z.string().min(3).max(200),
    summary: z.string().min(10).max(600),
    topics: z.array(z.enum(TOPICS)).min(1),
    org: z.string().min(1).max(80),
    location: z.string().max(160).nullish(),
    confidence: z.enum(CONFIDENCE),
    sources: z.array(sourceSchema).min(1),
    status: z.enum(["active", "cancelled", "superseded"]).optional(),
  })
  .strict();

export const findingsFileSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    queries: z.array(z.string()).default([]),
    failedSources: z.array(z.object({ url: z.string(), reason: z.string() })).default([]),
    notes: z.string().default(""),
    concerns: z.array(z.string()).default([]),
    entries: z.array(findingSchema),
  })
  .strict();

export type Finding = z.infer<typeof findingSchema>;
export type FindingsFile = z.infer<typeof findingsFileSchema>;

export class ApplyError extends Error {}

/** Fill in everything the agent should not be inventing, then validate. */
export function toEntry(finding: Finding, today: string): Entry {
  const candidate = {
    ...finding,
    endDate: finding.endDate ?? null,
    datePrecision: finding.datePrecision ?? "day",
    location: finding.location ?? null,
    status: finding.status ?? "active",
    id: deriveId(finding),
    firstSeen: today,
    lastVerified: today,
  };

  const parsed = entrySchema.safeParse(candidate);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ApplyError(`"${finding.title}": ${issue.path.join(".") || "(root)"} — ${issue.message}`);
  }
  return parsed.data;
}

export type ApplyResult = {
  entries: Entry[];
  runLog: RunLog;
  added: string[];
  updated: string[];
  pruned: string[];
};

/**
 * Fold a day's findings into the corpus. Pure: callers own reading and writing
 * files, which keeps the merge rules testable without touching disk.
 */
export function applyFindings(existing: Entry[], file: FindingsFile, today: string): ApplyResult {
  const incoming = file.entries.map((f) => toEntry(f, today));
  const { entries, added, updated, pruned } = mergeAll(existing, incoming, today);

  const runLog = runLogSchema.parse({
    date: file.date,
    added,
    updated,
    pruned,
    queries: file.queries,
    failedSources: file.failedSources,
    notes: file.notes,
    concerns: file.concerns,
  });

  return { entries, runLog, added, updated, pruned };
}
