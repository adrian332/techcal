import { describe, expect, it } from "vitest";
import { ApplyError, applyFindings, findingsFileSchema, toEntry, type Finding } from "../apply";
import type { Entry } from "../schema";

const TODAY = "2026-08-20";

function finding(over: Partial<Finding> = {}): Finding {
  return {
    kind: "event",
    date: "2026-11-30",
    endDate: "2026-12-04",
    title: "AWS re:Invent",
    summary: "AWS annual cloud conference in Las Vegas.",
    topics: ["devtools"],
    org: "AWS",
    confidence: "expected",
    sources: [{ url: "https://reinvent.awsevents.com/", title: "re:Invent", publisher: "AWS" }],
    ...over,
  };
}

function existing(over: Partial<Entry> = {}): Entry {
  return {
    id: "aws-re-invent-2026-11",
    kind: "event",
    date: "2026-11-30",
    endDate: "2026-12-04",
    datePrecision: "day",
    title: "AWS re:Invent",
    summary: "AWS annual cloud conference in Las Vegas.",
    topics: ["devtools"],
    org: "AWS",
    location: null,
    confidence: "expected",
    sources: [{ url: "https://reinvent.awsevents.com/", title: "re:Invent", publisher: "AWS" }],
    firstSeen: "2026-07-01",
    lastVerified: "2026-07-01",
    status: "active",
    ...over,
  };
}

describe("toEntry", () => {
  it("derives the id and stamps provenance rather than trusting the agent", () => {
    const entry = toEntry(finding(), TODAY);
    expect(entry.id).toBe("aws-re-invent-2026-11");
    expect(entry.firstSeen).toBe(TODAY);
    expect(entry.lastVerified).toBe(TODAY);
    expect(entry.status).toBe("active");
    expect(entry.datePrecision).toBe("day");
  });

  it("rejects a finding with no source", () => {
    expect(() => toEntry(finding({ sources: [] }), TODAY)).toThrow(ApplyError);
  });

  it("names the offending entry in the error, so a bad run is diagnosable", () => {
    expect(() => toEntry(finding({ sources: [] }), TODAY)).toThrow(/AWS re:Invent/);
  });

  it("rejects an end date before the start", () => {
    expect(() => toEntry(finding({ date: "2026-12-04", endDate: "2026-11-30" }), TODAY)).toThrow(ApplyError);
  });
});

describe("findingsFileSchema", () => {
  const base = { date: TODAY, entries: [finding()] };

  it("defaults the optional run-log fields", () => {
    const parsed = findingsFileSchema.parse(base);
    expect(parsed.queries).toEqual([]);
    expect(parsed.failedSources).toEqual([]);
    expect(parsed.notes).toBe("");
  });

  it("refuses fields the routine invented", () => {
    expect(findingsFileSchema.safeParse({ ...base, importance: "high" }).success).toBe(false);
    expect(findingsFileSchema.safeParse({ ...base, entries: [{ ...finding(), hype: 10 }] }).success).toBe(false);
  });

  it("refuses an id supplied by the agent — ids are derived, never given", () => {
    expect(findingsFileSchema.safeParse({ ...base, entries: [{ ...finding(), id: "whatever" }] }).success).toBe(false);
  });

  it("accepts an empty day — a quiet run is a valid run", () => {
    expect(findingsFileSchema.safeParse({ date: TODAY, entries: [] }).success).toBe(true);
  });
});

describe("applyFindings", () => {
  const file = (over: Record<string, unknown> = {}) =>
    findingsFileSchema.parse({ date: TODAY, entries: [finding()], ...over });

  it("adds a finding that is new", () => {
    const result = applyFindings([], file(), TODAY);
    expect(result.added).toEqual(["aws-re-invent-2026-11"]);
    expect(result.entries).toHaveLength(1);
  });

  it("updates rather than duplicates when the same thing is found again", () => {
    const result = applyFindings([existing()], file(), TODAY);
    expect(result.added).toEqual([]);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].lastVerified).toBe(TODAY);
    expect(result.entries[0].firstSeen).toBe("2026-07-01");
  });

  it("corrects a date the agent now knows better, keeping one entry", () => {
    const result = applyFindings([existing()], file({ entries: [finding({ date: "2026-12-01", endDate: "2026-12-05" })] }), TODAY);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].date).toBe("2026-12-01");
    expect(result.updated).toEqual(["aws-re-invent-2026-11"]);
  });

  it("accumulates a newly found source onto a known entry", () => {
    const second = finding({
      sources: [{ url: "https://theverge.com/aws", title: "Dates set", publisher: "The Verge" }],
    });
    const result = applyFindings([existing()], file({ entries: [second] }), TODAY);
    expect(result.entries[0].sources).toHaveLength(2);
  });

  it("prunes what has aged out of the window even on a quiet day", () => {
    const stale = existing({ id: "old-news-2026-05-01", kind: "announcement", date: "2026-05-01", endDate: null });
    const result = applyFindings([existing(), stale], file({ entries: [] }), TODAY);
    expect(result.pruned).toEqual(["old-news-2026-05-01"]);
  });

  it("files a run log that matches what actually changed", () => {
    const result = applyFindings([], file({ queries: ["aws reinvent 2026 dates"], notes: "quiet day" }), TODAY);
    expect(result.runLog).toMatchObject({
      date: TODAY,
      added: ["aws-re-invent-2026-11"],
      updated: [],
      pruned: [],
      queries: ["aws reinvent 2026 dates"],
      notes: "quiet day",
    });
  });

  it("records sources that failed, so a silent day is distinguishable from a broken one", () => {
    const result = applyFindings([], file({ failedSources: [{ url: "https://x.example", reason: "403" }] }), TODAY);
    expect(result.runLog.failedSources).toEqual([{ url: "https://x.example", reason: "403" }]);
  });

  it("is idempotent — re-applying the same findings changes nothing", () => {
    const first = applyFindings([], file(), TODAY);
    const second = applyFindings(first.entries, file(), TODAY);
    expect(second.added).toEqual([]);
    expect(second.updated).toEqual([]);
    expect(second.entries).toEqual(first.entries);
  });
});
