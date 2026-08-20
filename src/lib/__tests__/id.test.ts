import { describe, expect, it } from "vitest";
import { dedupeKey, deriveId, isSameThing, slugify } from "../id";

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
    const a = { kind: "event" as const, org: "Google", title: "Google I/O keynote" };
    const b = { kind: "event" as const, org: "Google", title: "Google Cloud Next keynote" };
    expect(dedupeKey(a)).not.toBe(dedupeKey(b));
  });

  it("ignores the date, so a shifted event still keys the same", () => {
    const a = { kind: "event" as const, org: "AWS", title: "AWS re:Invent" };
    expect(dedupeKey(a)).toBe(dedupeKey({ ...a }));
  });

  it("separates an announcement from an event of the same name", () => {
    expect(dedupeKey({ kind: "event", org: "Apple", title: "Fall event" })).not.toBe(
      dedupeKey({ kind: "announcement", org: "Apple", title: "Fall event" }),
    );
  });
});

describe("isSameThing", () => {
  const reinvent = { kind: "event" as const, org: "AWS", title: "AWS re:Invent", date: "2026-11-30" };

  it("matches an event that slipped across a month boundary", () => {
    expect(isSameThing(reinvent, { ...reinvent, date: "2026-12-01" })).toBe(true);
  });

  it("matches an event that moved by a few weeks", () => {
    expect(isSameThing(reinvent, { ...reinvent, date: "2026-12-20" })).toBe(true);
  });

  it("does not merge next year's edition into this year's", () => {
    expect(isSameThing(reinvent, { ...reinvent, date: "2027-11-29" })).toBe(false);
  });

  it("pins announcements to their exact day", () => {
    const news = { kind: "announcement" as const, org: "OpenAI", title: "New model released", date: "2026-08-19" };
    expect(isSameThing(news, { ...news, date: "2026-08-19" })).toBe(true);
    expect(isSameThing(news, { ...news, date: "2026-08-20" })).toBe(false);
  });

  it("never matches different things regardless of date", () => {
    expect(isSameThing(reinvent, { ...reinvent, title: "AWS Summit London" })).toBe(false);
  });
});

describe("deriveId org prefixing", () => {
  it("does not repeat an org the title already names", () => {
    expect(deriveId({ kind: "event", org: "AWS", title: "AWS re:Invent", date: "2026-11-30" })).toBe(
      "aws-re-invent-2026-11",
    );
  });

  it("adds the org when the title omits it", () => {
    expect(deriveId({ kind: "event", org: "Apple", title: "Fall iPhone event", date: "2026-09-08" })).toBe(
      "apple-fall-iphone-event-2026-09",
    );
  });

  it("still separates two orgs holding an identically named event", () => {
    const a = deriveId({ kind: "event", org: "Google", title: "Cloud Next", date: "2027-04-10" });
    const b = deriveId({ kind: "event", org: "Oracle", title: "Cloud Next", date: "2027-04-10" });
    expect(a).not.toBe(b);
  });
});
