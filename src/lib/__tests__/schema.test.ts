import { describe, expect, it } from "vitest";
import { entrySchema, manifestSchema } from "../schema";

const valid = {
  id: "apple-fall-iphone-event-2026-09",
  kind: "event",
  date: "2026-09-08",
  endDate: null,
  datePrecision: "day",
  title: "Apple fall iPhone event",
  summary: "Apple's annual September keynote, where the next iPhone is introduced.",
  topics: ["bigtech"],
  org: "Apple",
  location: null,
  confidence: "expected",
  sources: [{ url: "https://www.apple.com/newsroom/", title: "Newsroom", publisher: "Apple" }],
  firstSeen: "2026-08-01",
  lastVerified: "2026-08-20",
  status: "active",
};

function reject(over: Record<string, unknown>) {
  return entrySchema.safeParse({ ...valid, ...over }).success;
}

describe("entrySchema", () => {
  it("accepts a well-formed entry", () => {
    expect(entrySchema.safeParse(valid).success).toBe(true);
  });

  it("refuses an entry with no source — every claim must be traceable", () => {
    expect(reject({ sources: [] })).toBe(false);
  });

  it("refuses a non-URL source", () => {
    expect(reject({ sources: [{ url: "apple newsroom", title: "t", publisher: "p" }] })).toBe(false);
  });

  it("refuses a vague date", () => {
    expect(reject({ date: "September 2026" })).toBe(false);
    expect(reject({ date: "2026-13-01" })).toBe(false);
  });

  it("refuses an endDate before the start", () => {
    expect(reject({ date: "2026-09-08", endDate: "2026-09-01" })).toBe(false);
  });

  it("refuses lastVerified before firstSeen", () => {
    expect(reject({ firstSeen: "2026-08-20", lastVerified: "2026-08-01" })).toBe(false);
  });

  it("refuses an unknown topic", () => {
    expect(reject({ topics: ["crypto"] })).toBe(false);
    expect(reject({ topics: [] })).toBe(false);
  });

  it("refuses an id that is not kebab-case", () => {
    expect(reject({ id: "Apple Fall Event" })).toBe(false);
  });

  it("refuses unknown fields, so a drifting routine fails loudly", () => {
    expect(reject({ hype: "very" })).toBe(false);
  });

  it("applies defaults for optional shape fields", () => {
    const { endDate: _e, datePrecision: _d, status: _s, location: _l, ...bare } = valid;
    const parsed = entrySchema.parse(bare);
    expect(parsed).toMatchObject({ endDate: null, datePrecision: "day", status: "active", location: null });
  });
});

describe("manifestSchema", () => {
  it("accepts a manifest with a null lastRun", () => {
    const m = { schemaVersion: 1, lastRun: null, months: { "2026-09": 2 }, totalEntries: 2 };
    expect(manifestSchema.safeParse(m).success).toBe(true);
  });

  it("refuses a malformed month key", () => {
    const m = { schemaVersion: 1, lastRun: null, months: { sept: 2 }, totalEntries: 2 };
    expect(manifestSchema.safeParse(m).success).toBe(false);
  });
});
