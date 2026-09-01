import { describe, expect, it } from "vitest";
import { acronym, deriveId, isSameThing, orgTokens, slugify, titleTokens } from "../id";

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

describe("orgTokens", () => {
  it("drops the legal and event wrapper words", () => {
    expect([...orgTokens("NeurIPS Foundation")]).toEqual(["neurips"]);
    expect([...orgTokens("RSA Conference (RSAC)")]).toEqual(["rsa", "rsac"]);
    expect([...orgTokens("OpenJS Foundation / Node.js")]).toEqual(["openjs", "node", "js"]);
  });

  it("keeps the wrappers when they are all there is", () => {
    expect([...orgTokens("The Foundation")]).toEqual(["the", "foundation"]);
  });
});

describe("acronym", () => {
  it("reads the initials of a multi-word name", () => {
    expect(acronym("Consumer Technology Association")).toBe("cta");
    expect(acronym("Cloud Native Computing Foundation")).toBe("cncf");
  });

  it("declines to make an acronym of a single word", () => {
    expect(acronym("NeurIPS")).toBe("");
  });
});

describe("titleTokens", () => {
  it("strips the org back out of a title that restates it", () => {
    expect([...titleTokens("NeurIPS 2026", "NeurIPS Foundation")]).toEqual(["2026"]);
    expect([...titleTokens("RSA Conference 2027", "RSA Conference (RSAC)")]).toEqual(["2027"]);
  });

  it("keeps a title that is not just the org", () => {
    expect([...titleTokens("CES 2027", "Consumer Technology Association")]).toEqual(["ces", "2027"]);
  });

  it("falls back to the title when it names nothing but the org", () => {
    expect([...titleTokens("Apple", "Apple")]).toEqual(["apple"]);
  });
});

describe("isSameThing across differently spelled orgs", () => {
  // All three were live duplicates on the published calendar: the routine wrote
  // whatever each source called the organisation, and the old key was an exact
  // string match on it.
  it("matches a bare org against the same org with a wrapper word", () => {
    expect(isSameThing(
      { kind: "event", org: "NeurIPS", title: "NeurIPS 2026", date: "2026-12-06" },
      { kind: "event", org: "NeurIPS Foundation", title: "NeurIPS 2026", date: "2026-12-06" },
    )).toBe(true);
  });

  it("matches an acronym against its expansion", () => {
    expect(isSameThing(
      { kind: "event", org: "CTA", title: "CES 2027", date: "2027-01-06" },
      { kind: "event", org: "Consumer Technology Association", title: "CES 2027", date: "2027-01-06" },
    )).toBe(true);
  });

  it("matches when the org is spelled two ways and the title follows suit", () => {
    expect(isSameThing(
      { kind: "event", org: "RSA Conference (RSAC)", title: "RSA Conference 2027", date: "2027-05-03" },
      { kind: "event", org: "RSAC Conference", title: "RSAC 2027", date: "2027-05-03" },
    )).toBe(true);
  });

  it("does not merge two conferences that merely share a year", () => {
    expect(isSameThing(
      { kind: "event", org: "CTA", title: "CES 2027", date: "2027-01-06" },
      { kind: "event", org: "GSMA", title: "MWC Barcelona 2027", date: "2027-03-01" },
    )).toBe(false);
  });

  it("does not merge two deadlines from the same body that differ only by product", () => {
    // The case the 0.6 overlap floor exists for: these share "kev remediation
    // deadline cve" and are days apart, so only the product tells them apart.
    expect(isSameThing(
      { kind: "event", org: "CISA", title: "CISA KEV remediation deadline: Zimbra Collaboration Suite command injection (CVE-2026-73570)", date: "2026-08-24" },
      { kind: "event", org: "CISA", title: "CISA KEV remediation deadline: Gitea code injection (CVE-2026-60004)", date: "2026-08-28" },
    )).toBe(false);
  });

  it("does not merge two events from one org that share no distinctive words", () => {
    expect(isSameThing(
      { kind: "event", org: "Google", title: "Google I/O keynote", date: "2027-05-12" },
      { kind: "event", org: "Google", title: "Google Cloud Next keynote", date: "2027-04-10" },
    )).toBe(false);
  });

  it("matches an org named in full against its own initials in brackets", () => {
    expect(isSameThing(
      { kind: "event", org: "Amazon Web Services", title: "AWS re:Invent 2026", date: "2026-11-30" },
      { kind: "event", org: "AWS", title: "AWS re:Invent", date: "2026-11-30" },
    )).toBe(true);
  });

  it("still refuses to cross kinds", () => {
    expect(isSameThing(
      { kind: "event", org: "Apple", title: "Fall iPhone event", date: "2026-09-08" },
      { kind: "announcement", org: "Apple", title: "Fall iPhone event", date: "2026-09-08" },
    )).toBe(false);
  });

  it("matches the same event described with reordered words", () => {
    expect(isSameThing(
      { kind: "event", org: "AWS", title: "re:Invent 2026 conference", date: "2026-11-30" },
      { kind: "event", org: "AWS", title: "Conference: re:Invent 2026", date: "2026-11-30" },
    )).toBe(true);
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

describe("recurring events", () => {
  // The drift window is 2.5 months, longer than a monthly recurrence, so
  // without an edition check September's Patch Tuesday absorbs November's.
  const tuesday = (title: string, date: string) => ({ kind: "event" as const, org: "Microsoft", title, date });

  it("keeps two months of the same recurring event apart", () => {
    expect(isSameThing(
      { ...tuesday("Microsoft Patch Tuesday - September 2026", "2026-09-08"), org: "Microsoft (MSRC)" },
      tuesday("Microsoft Patch Tuesday - November 2026", "2026-11-10"),
    )).toBe(false);
  });

  it("keeps an undated recurrence apart from a month it does not fall in", () => {
    expect(isSameThing(
      tuesday("Microsoft Patch Tuesday", "2026-10-13"),
      tuesday("Microsoft Patch Tuesday - November 2026", "2026-11-10"),
    )).toBe(false);
  });

  it("still merges the same month written two ways", () => {
    expect(isSameThing(
      tuesday("Microsoft Patch Tuesday", "2026-11-10"),
      tuesday("Microsoft Patch Tuesday - November 2026", "2026-11-10"),
    )).toBe(true);
  });

  it("refuses to merge two editions that name different years", () => {
    expect(isSameThing(
      { kind: "event", org: "AWS", title: "AWS re:Invent 2026", date: "2026-11-30" },
      { kind: "event", org: "AWS", title: "AWS re:Invent 2027", date: "2027-01-10" },
    )).toBe(false);
  });

  it("leaves ordinary drift alone when no edition is named", () => {
    const base = { kind: "event" as const, org: "AWS", title: "AWS re:Invent", date: "2026-11-30" };
    expect(isSameThing(base, { ...base, date: "2026-12-20" })).toBe(true);
  });
});
