import { describe, expect, it } from "vitest";
import { addDays, addMonths, groupByMonth, inWindow, mergeAll, mergeEntry, windowFor } from "../merge";
import type { Entry } from "../schema";

const TODAY = "2026-08-20";

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
    location: null,
    confidence: "expected",
    sources: [{ url: "https://apple.com/newsroom/", title: "Newsroom", publisher: "Apple" }],
    firstSeen: "2026-08-01",
    lastVerified: "2026-08-01",
    status: "active",
    ...over,
  };
}

describe("date helpers", () => {
  it("adds days across a month boundary", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("clamps to the last day when a month is shorter", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-08-20", 12)).toBe("2027-08-20");
  });
});

describe("windowFor", () => {
  it("spans 60 days back and 12 months ahead", () => {
    expect(windowFor(TODAY)).toEqual({ from: "2026-06-21", to: "2027-08-20" });
  });
});

describe("inWindow", () => {
  it("keeps an announcement inside the lookback", () => {
    expect(inWindow(entry({ kind: "announcement", date: "2026-07-01" }), TODAY)).toBe(true);
  });

  it("drops an announcement older than the lookback", () => {
    expect(inWindow(entry({ kind: "announcement", date: "2026-06-01" }), TODAY)).toBe(false);
  });

  it("drops an event beyond 12 months out", () => {
    expect(inWindow(entry({ date: "2027-09-01" }), TODAY)).toBe(false);
  });

  it("keeps a multi-day event whose end is still inside the window", () => {
    expect(inWindow(entry({ date: "2026-06-18", endDate: "2026-06-25" }), TODAY)).toBe(true);
  });
});

describe("mergeEntry", () => {
  it("takes the incoming date and appends new sources without losing old ones", () => {
    const merged = mergeEntry(
      entry(),
      entry({
        date: "2026-09-10",
        confidence: "confirmed",
        lastVerified: "2026-08-20",
        firstSeen: "2026-08-20",
        sources: [{ url: "https://theverge.com/apple", title: "Apple sets date", publisher: "The Verge" }],
      }),
    );

    expect(merged.date).toBe("2026-09-10");
    expect(merged.confidence).toBe("confirmed");
    expect(merged.sources).toHaveLength(2);
    expect(merged.firstSeen).toBe("2026-08-01");
    expect(merged.lastVerified).toBe("2026-08-20");
  });

  it("does not duplicate a source already recorded", () => {
    const merged = mergeEntry(entry(), entry({ lastVerified: "2026-08-20" }));
    expect(merged.sources).toHaveLength(1);
  });

  it("unions topics rather than replacing them", () => {
    const merged = mergeEntry(entry(), entry({ topics: ["ai"] }));
    expect(merged.topics.sort()).toEqual(["ai", "bigtech"]);
  });

  it("never moves firstSeen forward", () => {
    const merged = mergeEntry(entry({ firstSeen: "2026-07-01" }), entry({ firstSeen: "2026-08-20" }));
    expect(merged.firstSeen).toBe("2026-07-01");
  });
});

describe("mergeAll", () => {
  it("updates rather than appends when the same thing is found again", () => {
    const result = mergeAll([entry()], [entry({ confidence: "confirmed", lastVerified: TODAY })], TODAY);
    expect(result.entries).toHaveLength(1);
    expect(result.added).toEqual([]);
    expect(result.updated).toEqual(["apple-fall-iphone-event-2026-09"]);
    expect(result.entries[0].confidence).toBe("confirmed");
  });

  it("reports no update when the day's findings change nothing", () => {
    const result = mergeAll([entry()], [entry()], TODAY);
    expect(result.updated).toEqual([]);
    expect(result.added).toEqual([]);
  });

  it("updates in place when an event slips across a month boundary", () => {
    const slipped = entry({ id: "apple-fall-iphone-event-2026-10", date: "2026-10-02", lastVerified: TODAY });
    const result = mergeAll([entry()], [slipped], TODAY);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].id).toBe("apple-fall-iphone-event-2026-09");
    expect(result.entries[0].date).toBe("2026-10-02");
  });

  it("catches a near-duplicate that derived a different id", () => {
    const restated = entry({
      id: "apple-iphone-fall-event-2026-09",
      title: "Fall iPhone event, Apple",
      lastVerified: TODAY,
    });
    const result = mergeAll([entry()], [restated], TODAY);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].id).toBe("apple-fall-iphone-event-2026-09");
  });

  it("adds a genuinely new entry", () => {
    const other = entry({ id: "google-io-2027-05", org: "Google", title: "Google I/O", date: "2027-05-12" });
    const result = mergeAll([entry()], [other], TODAY);
    expect(result.entries).toHaveLength(2);
    expect(result.added).toEqual(["google-io-2027-05"]);
  });

  it("prunes what has fallen outside the window", () => {
    const stale = entry({ id: "old-news-2026-05-01", kind: "announcement", date: "2026-05-01" });
    const result = mergeAll([entry(), stale], [], TODAY);
    expect(result.pruned).toEqual(["old-news-2026-05-01"]);
    expect(result.entries.map((e) => e.id)).toEqual(["apple-fall-iphone-event-2026-09"]);
  });

  it("is stable when run twice over its own output", () => {
    const first = mergeAll([entry()], [entry({ id: "google-io-2027-05", org: "Google", title: "Google I/O", date: "2027-05-12" })], TODAY);
    const second = mergeAll(first.entries, [], TODAY);
    expect(second.entries).toEqual(first.entries);
    expect(second.added).toEqual([]);
    expect(second.updated).toEqual([]);
  });

  it("returns entries sorted by date", () => {
    const later = entry({ id: "b-2027-01", date: "2027-01-05" });
    const earlier = entry({ id: "a-2026-09", date: "2026-09-01" });
    const result = mergeAll([], [later, earlier], TODAY);
    expect(result.entries.map((e) => e.id)).toEqual(["a-2026-09", "b-2027-01"]);
  });
});

describe("groupByMonth", () => {
  it("files each entry under its own month", () => {
    const grouped = groupByMonth([entry(), entry({ id: "x-2027-01", date: "2027-01-05" })]);
    expect([...grouped.keys()]).toEqual(["2026-09", "2027-01"]);
  });
});
