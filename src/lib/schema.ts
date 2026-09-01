import { z } from "zod";

export const TOPICS = ["ai", "devtools", "cloud", "mobile", "hardware", "bigtech", "security"] as const;
export const KINDS = ["event", "announcement"] as const;
export const CONFIDENCE = ["confirmed", "expected", "rumored"] as const;
export const PRECISION = ["day", "month", "quarter"] as const;
export const STATUS = ["active", "cancelled", "superseded"] as const;

export type Topic = (typeof TOPICS)[number];
export type Kind = (typeof KINDS)[number];

export const SCHEMA_VERSION = 1;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be an ISO date (YYYY-MM-DD)")
  .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)), "not a real date");

/**
 * A source must be a plain http(s) link. `z.string().url()` alone is too
 * permissive on both counts that matter here: it accepts `javascript:`,
 * `data:` and `vbscript:` schemes, and it allows raw control characters inside
 * the string. These URLs are written into a published .ics feed, where a CR/LF
 * ends the current property and starts a new one — so an unfiltered newline
 * lets a source URL append whole events to a subscriber's calendar.
 */
export const httpUrl = z
  .string()
  .url()
  .refine((u) => /^https?:\/\//i.test(u), "must be an http(s) URL")
  // Spaces included: a URL has no business carrying one unencoded, and the
  // .ics line-folding rules give a leading space its own meaning.
  .refine((u) => !/[\u0000-\u0020\u007f]/.test(u), "must not contain control characters or spaces");

export const sourceSchema = z.object({
  url: httpUrl,
  title: z.string().min(1),
  publisher: z.string().min(1),
});

export const entrySchema = z
  .object({
    id: z
      .string()
      .min(3)
      .regex(/^[a-z0-9-]+$/, "id must be lowercase kebab-case"),
    kind: z.enum(KINDS),
    date: isoDate,
    endDate: isoDate.nullable().default(null),
    datePrecision: z.enum(PRECISION).default("day"),
    title: z.string().min(3).max(200),
    summary: z.string().min(10).max(600),
    topics: z.array(z.enum(TOPICS)).min(1),
    org: z.string().min(1).max(80),
    location: z.string().max(160).nullable().default(null),
    confidence: z.enum(CONFIDENCE),
    sources: z.array(sourceSchema).min(1, "every entry needs at least one source"),
    firstSeen: isoDate,
    lastVerified: isoDate,
    status: z.enum(STATUS).default("active"),
  })
  .strict()
  .refine((e) => !e.endDate || e.endDate >= e.date, {
    message: "endDate must not be before date",
    path: ["endDate"],
  })
  .refine((e) => e.lastVerified >= e.firstSeen, {
    message: "lastVerified must not be before firstSeen",
    path: ["lastVerified"],
  });

export const monthFileSchema = z.array(entrySchema);

export const manifestSchema = z
  .object({
    schemaVersion: z.number().int().positive(),
    lastRun: isoDate.nullable(),
    months: z.record(z.string().regex(/^\d{4}-\d{2}$/), z.number().int().nonnegative()),
    totalEntries: z.number().int().nonnegative(),
  })
  .strict();

export const runLogSchema = z
  .object({
    date: isoDate,
    added: z.array(z.string()),
    updated: z.array(z.string()),
    pruned: z.array(z.string()),
    queries: z.array(z.string()),
    failedSources: z.array(z.object({ url: z.string(), reason: z.string() })),
    notes: z.string().default(""),
  })
  .strict();

export type Source = z.infer<typeof sourceSchema>;
export type Entry = z.infer<typeof entrySchema>;
export type Manifest = z.infer<typeof manifestSchema>;
export type RunLog = z.infer<typeof runLogSchema>;
