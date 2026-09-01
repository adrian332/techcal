import { describe, expect, it } from "vitest";
import {
  densityByMonth,
  formatRange,
  localDayISO,
  monthGrid,
  monthLabel,
  packWeek,
  relativeDay,
  shiftMonth,
  spansDay,
} from "../calendar";
import type { Entry } from "../schema";

function entry(over: Partial<Entry> = {}): Entry {
  return {
    id: "x",
    kind: "event",
    date: "2026-09-08",
    endDate: null,
    datePrecision: "day",
    title: "Thing",
    summary: "A thing happens.",
    topics: ["bigtech"],
    org: "Org",
    location: null,
    confidence: "expected",
    sources: [{ url: "https://example.com", title: "t", publisher: "p" }],
    firstSeen: "2026-08-01",
    lastVerified: "2026-08-01",
    status: "active",
    ...over,
  };
}

describe("shiftMonth", () => {
  it("crosses year boundaries in both directions", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-08", 12)).toBe("2027-08");
  });
});

describe("monthGrid", () => {
  it("starts the grid on a Monday and covers whole weeks", () => {
    const { days, weeks } = monthGrid("2026-09");
    expect(days.length % 7).toBe(0);
    expect(new Date(`${days[0]}T00:00:00Z`).getUTCDay()).toBe(1);
    expect(weeks[0]).toHaveLength(7);
  });

  it("includes every day of the month plus padding from neighbours", () => {
    const { days } = monthGrid("2026-09");
    expect(days).toContain("2026-09-01");
    expect(days).toContain("2026-09-30");
    expect(days[0] < "2026-09-01" || days[0] === "2026-09-01").toBe(true);
  });

  it("handles a month that begins on the week start exactly", () => {
    const { days } = monthGrid("2026-06"); // 1 June 2026 is a Monday
    expect(days[0]).toBe("2026-06-01");
  });

  it("handles February in a leap year", () => {
    const { days } = monthGrid("2028-02");
    expect(days).toContain("2028-02-29");
  });
});

describe("spansDay", () => {
  const multi = entry({ date: "2026-11-30", endDate: "2026-12-04" });

  it("covers every day between start and end", () => {
    expect(spansDay(multi, "2026-11-30")).toBe(true);
    expect(spansDay(multi, "2026-12-02")).toBe(true);
    expect(spansDay(multi, "2026-12-04")).toBe(true);
  });

  it("excludes days outside the run", () => {
    expect(spansDay(multi, "2026-11-29")).toBe(false);
    expect(spansDay(multi, "2026-12-05")).toBe(false);
  });
});

describe("packWeek", () => {
  const week = ["2026-11-30", "2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04", "2026-12-05", "2026-12-06"];

  it("draws a multi-day event as one bar spanning its days", () => {
    const [seg] = packWeek(week, [entry({ id: "reinvent", date: "2026-11-30", endDate: "2026-12-04" })]);
    expect(seg.column).toBe(0);
    expect(seg.span).toBe(5);
    expect(seg.continuesBefore).toBe(false);
    expect(seg.continuesAfter).toBe(false);
  });

  it("clips a bar that runs past the end of the week and flags it", () => {
    const [seg] = packWeek(week, [entry({ id: "long", date: "2026-12-03", endDate: "2026-12-10" })]);
    expect(seg.column).toBe(3);
    expect(seg.span).toBe(4);
    expect(seg.continuesAfter).toBe(true);
  });

  it("clips a bar that started in an earlier week", () => {
    const [seg] = packWeek(week, [entry({ id: "long", date: "2026-11-25", endDate: "2026-12-01" })]);
    expect(seg.column).toBe(0);
    expect(seg.span).toBe(2);
    expect(seg.continuesBefore).toBe(true);
  });

  it("puts colliding entries in separate lanes", () => {
    const segs = packWeek(week, [
      entry({ id: "a", date: "2026-11-30", endDate: "2026-12-02" }),
      entry({ id: "b", date: "2026-12-01" }),
    ]);
    expect(segs.map((s) => [s.entry.id, s.lane])).toEqual([
      ["a", 0],
      ["b", 1],
    ]);
  });

  it("reuses a lane when entries do not overlap", () => {
    const segs = packWeek(week, [
      entry({ id: "a", date: "2026-11-30" }),
      entry({ id: "b", date: "2026-12-03" }),
    ]);
    expect(segs.every((s) => s.lane === 0)).toBe(true);
  });

  it("ignores entries from other weeks", () => {
    expect(packWeek(week, [entry({ date: "2026-10-01" })])).toHaveLength(0);
  });

  it("is deterministic for entries sharing a day", () => {
    const input = [entry({ id: "zebra", date: "2026-12-01" }), entry({ id: "alpha", date: "2026-12-01" })];
    expect(packWeek(week, input).map((s) => s.entry.id)).toEqual(["alpha", "zebra"]);
    expect(packWeek(week, [...input].reverse()).map((s) => s.entry.id)).toEqual(["alpha", "zebra"]);
  });
});

describe("densityByMonth", () => {
  it("counts entries per month and keeps empty months in the series", () => {
    const got = densityByMonth([entry({ date: "2026-09-08" }), entry({ date: "2026-09-20" })], "2026-08", 3);
    expect(got).toEqual([
      { month: "2026-08", count: 0 },
      { month: "2026-09", count: 2 },
      { month: "2026-10", count: 0 },
    ]);
  });

  it("ignores entries outside the horizon", () => {
    const got = densityByMonth([entry({ date: "2030-01-01" })], "2026-08", 2);
    expect(got.every((m) => m.count === 0)).toBe(true);
  });
});

describe("formatRange", () => {
  it("shows a single day plainly", () => {
    expect(formatRange(entry({ date: "2026-09-08" }))).toBe("8 Sep 2026");
  });

  it("collapses the month when a range stays inside it", () => {
    expect(formatRange(entry({ date: "2026-09-15", endDate: "2026-09-17" }))).toBe("15 – 17 Sep 2026");
  });

  it("keeps both months when a range crosses one", () => {
    expect(formatRange(entry({ date: "2026-11-30", endDate: "2026-12-04" }))).toBe("30 Nov – 4 Dec 2026");
  });

  it("says only the month when that is all that is known", () => {
    expect(formatRange(entry({ date: "2026-09-01", datePrecision: "month" }))).toBe("September 2026");
  });

  it("says the quarter when that is all that is known", () => {
    expect(formatRange(entry({ date: "2026-07-01", datePrecision: "quarter" }))).toBe("Q3 2026");
  });
});

describe("relativeDay", () => {
  it("uses words for the days either side of today", () => {
    expect(relativeDay("2026-08-20", "2026-08-20")).toBe("today");
    expect(relativeDay("2026-08-21", "2026-08-20")).toBe("tomorrow");
    expect(relativeDay("2026-08-19", "2026-08-20")).toBe("yesterday");
  });

  it("counts in days, then months, then years", () => {
    expect(relativeDay("2026-08-25", "2026-08-20")).toBe("in 5 days");
    expect(relativeDay("2026-11-20", "2026-08-20")).toBe("in 3 months");
    expect(relativeDay("2028-08-20", "2026-08-20")).toBe("in 2 years");
  });
});

describe("monthLabel", () => {
  it("reads as a human month", () => {
    expect(monthLabel("2026-09")).toBe("September 2026");
  });
});

describe("localDayISO", () => {
  it("reads the local calendar day, not the UTC one", () => {
    // 1 Sep 08:00 in UTC+8 is still 31 Aug in UTC; the reader's day is the one that counts.
    const d = new Date("2026-09-01T00:00:00+08:00");
    expect(d.toISOString().slice(0, 10)).toBe("2026-08-31");
    expect(localDayISO(new Date(2026, 8, 1, 0, 0, 0))).toBe("2026-09-01");
  });

  it("zero-pads month and day", () => {
    expect(localDayISO(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
