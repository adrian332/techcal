import { describe, expect, it } from "vitest";
import { counts, queryTerms, selectById, selectInRange, selectUpcoming, squash } from "../select";
import type { Entry } from "../schema";

function entry(over: Partial<Entry> = {}): Entry {
  return {
    id: "apple-fall-iphone-event-2026-09",
    kind: "event",
    date: "2026-09-08",
    endDate: null,
    datePrecision: "day",
    title: "Apple fall iPhone event",
    summary: "Apple's annual September keynote.",
    topics: ["bigtech"],
    org: "Apple",
    location: "Cupertino",
    confidence: "expected",
    sources: [{ url: "https://apple.com/newsroom/", title: "Newsroom", publisher: "Apple" }],
    firstSeen: "2026-08-01",
    lastVerified: "2026-08-20",
    status: "active",
    ...over,
  };
}

const corpus: Entry[] = [
  entry(),
  entry({ id: "openai-model-launch-2026-08-19", kind: "announcement", date: "2026-08-19", org: "OpenAI", title: "New model announced", topics: ["ai"], summary: "OpenAI announced a new frontier model." }),
  entry({ id: "aws-reinvent-2026-11", date: "2026-11-30", endDate: "2026-12-04", org: "AWS", title: "AWS re:Invent", topics: ["devtools", "ai"], summary: "AWS annual cloud conference in Las Vegas." }),
  entry({ id: "msrc-patch-tuesday-2026-10", date: "2026-10-13", org: "Microsoft", title: "Patch Tuesday", topics: ["security"], summary: "Monthly Microsoft security rollup.", confidence: "confirmed" }),
  entry({ id: "dead-entry-2026-09", date: "2026-09-20", title: "Cancelled thing", status: "superseded", summary: "This entry was superseded by another." }),
];

const ALL = ["2026-01-01", "2027-12-31"] as const;

describe("counts", () => {
  it("counts the live corpus by kind, ignoring superseded entries", () => {
    expect(counts(corpus)).toEqual({ total: 4, events: 3, announcements: 1 });
  });
});

describe("selectInRange", () => {
  it("returns entries that fall inside the range", () => {
    const got = selectInRange(corpus, "2026-09-01", "2026-09-30");
    expect(got.map((e) => e.id)).toEqual(["apple-fall-iphone-event-2026-09"]);
  });

  it("includes a multi-day event that merely overlaps the range", () => {
    const got = selectInRange(corpus, "2026-12-01", "2026-12-31");
    expect(got.map((e) => e.id)).toEqual(["aws-reinvent-2026-11"]);
  });

  it("hides superseded entries", () => {
    expect(selectInRange(corpus, ...ALL).map((e) => e.id)).not.toContain("dead-entry-2026-09");
  });

  it("orders by date, then title", () => {
    const got = selectInRange([entry({ id: "b", title: "Zebra" }), entry({ id: "a", title: "Aardvark" })], ...ALL);
    expect(got.map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("filters by topic, matching any overlap", () => {
    const got = selectInRange(corpus, ...ALL, { topics: ["ai"] });
    expect(got.map((e) => e.id).sort()).toEqual(["aws-reinvent-2026-11", "openai-model-launch-2026-08-19"]);
  });

  it("filters by kind", () => {
    const got = selectInRange(corpus, ...ALL, { kinds: ["announcement"] });
    expect(got.map((e) => e.id)).toEqual(["openai-model-launch-2026-08-19"]);
  });

  it("filters by confidence", () => {
    const got = selectInRange(corpus, ...ALL, { confidence: ["confirmed"] });
    expect(got.map((e) => e.id)).toEqual(["msrc-patch-tuesday-2026-10"]);
  });

  it("combines topic and kind filters conjunctively", () => {
    const got = selectInRange(corpus, ...ALL, { topics: ["ai"], kinds: ["event"] });
    expect(got.map((e) => e.id)).toEqual(["aws-reinvent-2026-11"]);
  });

  it("searches title, summary, org and location", () => {
    const ids = (search: string) => selectInRange(corpus, ...ALL, { search }).map((e) => e.id);
    expect(ids("reinvent")).toEqual(["aws-reinvent-2026-11"]);
    expect(ids("las vegas")).toEqual(["aws-reinvent-2026-11"]);
    expect(ids("microsoft")).toEqual(["msrc-patch-tuesday-2026-10"]);
    expect(ids("cupertino")).toContain("apple-fall-iphone-event-2026-09");
  });

  it("finds a punctuation-split name by either half or the joined form", () => {
    const ids = (search: string) => selectInRange(corpus, ...ALL, { search }).map((e) => e.id);
    expect(ids("invent")).toEqual(["aws-reinvent-2026-11"]);
    expect(ids("re:invent")).toEqual(["aws-reinvent-2026-11"]);
  });

  it("matches on a prefix, so search works as you type", () => {
    expect(selectInRange(corpus, ...ALL, { search: "keyno" })).toHaveLength(1);
  });

  it("ANDs the terms rather than ORing them", () => {
    expect(selectInRange(corpus, ...ALL, { search: "apple keynote" })).toHaveLength(1);
    expect(selectInRange(corpus, ...ALL, { search: "apple reinvent" })).toHaveLength(0);
  });

  it("survives punctuation in the search box without throwing", () => {
    expect(() => selectInRange(corpus, ...ALL, { search: 're:Invent "AWS"' })).not.toThrow();
  });

  it("returns nothing rather than everything for a no-match search", () => {
    expect(selectInRange(corpus, ...ALL, { search: "zzzznotathing" })).toHaveLength(0);
  });

  it("treats an all-punctuation search as no search at all", () => {
    expect(selectInRange(corpus, ...ALL, { search: "!!!" })).toHaveLength(4);
  });
});

describe("selectUpcoming", () => {
  it("lists future entries in date order, honouring the limit", () => {
    const got = selectUpcoming(corpus, "2026-09-01", 2);
    expect(got.map((e) => e.id)).toEqual(["apple-fall-iphone-event-2026-09", "msrc-patch-tuesday-2026-10"]);
  });

  it("still includes an event that started before today but has not ended", () => {
    const got = selectUpcoming(corpus, "2026-12-02", 5);
    expect(got.map((e) => e.id)).toEqual(["aws-reinvent-2026-11"]);
  });
});

describe("selectById", () => {
  it("finds an entry by id and returns null for an unknown one", () => {
    expect(selectById(corpus, "aws-reinvent-2026-11")?.org).toBe("AWS");
    expect(selectById(corpus, "nope")).toBeNull();
  });

  it("still resolves a superseded entry, so an old link explains itself", () => {
    expect(selectById(corpus, "dead-entry-2026-09")?.status).toBe("superseded");
  });
});

describe("squash", () => {
  it("joins punctuation-split words so they are findable as one", () => {
    expect(squash("AWS re:Invent")).toBe("AWS reInvent");
    expect(squash("Node.js 24")).toBe("Nodejs 24");
    expect(squash(".NET 11")).toBe("NET 11");
  });

  it("leaves ordinary words alone", () => {
    expect(squash("Apple fall iPhone event")).toBe("Apple fall iPhone event");
  });
});

describe("queryTerms", () => {
  it("strips punctuation from each term rather than splitting on it", () => {
    expect(queryTerms('re:Invent "AWS"')).toEqual(["reinvent", "aws"]);
    expect(queryTerms("Node.js")).toEqual(["nodejs"]);
    expect(queryTerms("   ")).toEqual([]);
  });
});
