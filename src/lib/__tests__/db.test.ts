import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getMeta, openDb, replaceAll, squash, type DB } from "../db";
import { counts, entriesInRange, entryById, upcoming } from "../query";
import type { Entry } from "../schema";

let dir: string;
let db: DB;

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

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "techcal-"));
  db = openDb(path.join(dir, "test.db"));
  replaceAll(db, corpus, "2026-08-20T00:00:00Z");
});

afterEach(() => {
  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("replaceAll", () => {
  it("stores every entry and records the sync time", () => {
    expect(counts(db)).toEqual({ total: 4, events: 3, announcements: 1 });
    expect(getMeta(db, "lastSync")).toBe("2026-08-20T00:00:00Z");
  });

  it("is idempotent — re-ingesting the same corpus changes nothing", () => {
    replaceAll(db, corpus, "2026-08-21T00:00:00Z");
    expect(counts(db)).toEqual({ total: 4, events: 3, announcements: 1 });
    expect(db.prepare("SELECT COUNT(*) AS n FROM events").get()).toEqual({ n: 5 });
  });

  it("drops rows the JSON no longer contains", () => {
    replaceAll(db, [corpus[0]], "2026-08-21T00:00:00Z");
    expect(entryById("aws-reinvent-2026-11", db)).toBeNull();
  });

  it("round-trips arrays and nullable fields", () => {
    const got = entryById("aws-reinvent-2026-11", db)!;
    expect(got.topics).toEqual(["devtools", "ai"]);
    expect(got.sources[0].publisher).toBe("Apple");
    expect(got.endDate).toBe("2026-12-04");
    expect(entryById("msrc-patch-tuesday-2026-10", db)!.endDate).toBeNull();
  });
});

describe("entriesInRange", () => {
  it("returns entries that fall inside the range", () => {
    const got = entriesInRange("2026-09-01", "2026-09-30", {}, db);
    expect(got.map((e) => e.id)).toEqual(["apple-fall-iphone-event-2026-09"]);
  });

  it("includes a multi-day event that merely overlaps the range", () => {
    const got = entriesInRange("2026-12-01", "2026-12-31", {}, db);
    expect(got.map((e) => e.id)).toEqual(["aws-reinvent-2026-11"]);
  });

  it("hides superseded entries", () => {
    const got = entriesInRange("2026-01-01", "2027-12-31", {}, db);
    expect(got.map((e) => e.id)).not.toContain("dead-entry-2026-09");
  });

  it("filters by topic, matching any overlap", () => {
    const got = entriesInRange("2026-01-01", "2027-12-31", { topics: ["ai"] }, db);
    expect(got.map((e) => e.id).sort()).toEqual(["aws-reinvent-2026-11", "openai-model-launch-2026-08-19"]);
  });

  it("filters by kind", () => {
    const got = entriesInRange("2026-01-01", "2027-12-31", { kinds: ["announcement"] }, db);
    expect(got.map((e) => e.id)).toEqual(["openai-model-launch-2026-08-19"]);
  });

  it("combines topic and kind filters conjunctively", () => {
    const got = entriesInRange("2026-01-01", "2027-12-31", { topics: ["ai"], kinds: ["event"] }, db);
    expect(got.map((e) => e.id)).toEqual(["aws-reinvent-2026-11"]);
  });

  it("full-text searches title, summary and org", () => {
    expect(entriesInRange("2026-01-01", "2027-12-31", { search: "reinvent" }, db).map((e) => e.id)).toEqual(["aws-reinvent-2026-11"]);
    expect(entriesInRange("2026-01-01", "2027-12-31", { search: "las vegas" }, db).map((e) => e.id)).toEqual(["aws-reinvent-2026-11"]);
    expect(entriesInRange("2026-01-01", "2027-12-31", { search: "microsoft" }, db).map((e) => e.id)).toEqual(["msrc-patch-tuesday-2026-10"]);
  });

  it("matches on a prefix, so search works as you type", () => {
    expect(entriesInRange("2026-01-01", "2027-12-31", { search: "keyno" }, db)).toHaveLength(1);
  });

  it("survives punctuation in the search box without throwing", () => {
    expect(() => entriesInRange("2026-01-01", "2027-12-31", { search: 're:Invent "AWS"' }, db)).not.toThrow();
  });

  it("returns nothing rather than everything for a no-match search", () => {
    expect(entriesInRange("2026-01-01", "2027-12-31", { search: "zzzznotathing" }, db)).toHaveLength(0);
  });
});

describe("upcoming", () => {
  it("lists future entries in date order, honouring the limit", () => {
    const got = upcoming("2026-09-01", 2, {}, db);
    expect(got.map((e) => e.id)).toEqual(["apple-fall-iphone-event-2026-09", "msrc-patch-tuesday-2026-10"]);
  });

  it("still includes an event that started before today but has not ended", () => {
    const got = upcoming("2026-12-02", 5, {}, db);
    expect(got.map((e) => e.id)).toEqual(["aws-reinvent-2026-11"]);
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

describe("schema versioning", () => {
  it("rebuilds the cache when the stored version is stale", () => {
    const file = path.join(dir, "stale.db");
    const first = openDb(file);
    replaceAll(first, corpus, "2026-08-20T00:00:00Z");
    first.pragma("user_version = 0");
    first.close();

    const reopened = openDb(file);
    expect(counts(reopened)).toEqual({ total: 0, events: 0, announcements: 0 });
    reopened.close();
  });
});
