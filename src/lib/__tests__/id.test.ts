import { describe, expect, it } from "vitest";
import { dedupeKey, deriveId, slugify } from "../id";

describe("slugify", () => {
  it("produces lowercase kebab-case", () => {
    expect(slugify("Apple Fall iPhone Event")).toBe("apple-fall-iphone-event");
  });

  it("strips accents and punctuation", () => {
    expect(slugify("Café: Déjà Vu (2026)!")).toBe("cafe-deja-vu-2026");
  });

  it("never leaves a trailing hyphen after truncation", () => {
    const s = slugify(`${"a".repeat(58)} bbbb`);
    expect(s).not.toMatch(/-$/);
    expect(s.length).toBeLessThanOrEqual(60);
  });
});

describe("deriveId", () => {
  const base = { kind: "event" as const, org: "Apple", title: "Fall iPhone event", date: "2026-09-08" };

  it("is stable across runs", () => {
    expect(deriveId(base)).toBe(deriveId({ ...base }));
  });

  it("keeps one identity when an event's day shifts within the month", () => {
    expect(deriveId({ ...base, date: "2026-09-10" })).toBe(deriveId(base));
  });

  it("separates an event that moved to another month", () => {
    expect(deriveId({ ...base, date: "2026-10-08" })).not.toBe(deriveId(base));
  });

  it("keys announcements by exact day, since the day is the fact", () => {
    const a = { ...base, kind: "announcement" as const };
    expect(deriveId({ ...a, date: "2026-09-10" })).not.toBe(deriveId(a));
  });
});

describe("dedupeKey", () => {
  it("matches the same event described with reordered words", () => {
    const a = { kind: "event" as const, org: "AWS", title: "re:Invent 2026 conference", date: "2026-11-30" };
    const b = { kind: "event" as const, org: "AWS", title: "Conference: re:Invent 2026", date: "2026-11-30" };
    expect(dedupeKey(a)).toBe(dedupeKey(b));
  });

  it("does not collapse genuinely different events from one org", () => {
    const a = { kind: "event" as const, org: "Google", title: "Google I/O keynote", date: "2027-05-12" };
    const b = { kind: "event" as const, org: "Google", title: "Google Cloud Next keynote", date: "2027-05-12" };
    expect(dedupeKey(a)).not.toBe(dedupeKey(b));
  });
});
