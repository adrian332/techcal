import { describe, expect, it } from "vitest";
import { escapeText, fold, safeUri, toIcs } from "../ics";
import type { Entry } from "../schema";

function entry(over: Partial<Entry> = {}): Entry {
  return {
    id: "aws-reinvent-2026-11",
    kind: "event",
    date: "2026-11-30",
    endDate: "2026-12-04",
    datePrecision: "day",
    title: "AWS re:Invent",
    summary: "AWS annual cloud conference.",
    topics: ["devtools", "ai"],
    org: "AWS",
    location: "Las Vegas, NV",
    confidence: "confirmed",
    sources: [{ url: "https://reinvent.awsevents.com/", title: "re:Invent", publisher: "AWS" }],
    firstSeen: "2026-08-01",
    lastVerified: "2026-08-20",
    status: "active",
    ...over,
  };
}

const OPTS = { stamp: "20260820T000000Z" };

describe("escapeText", () => {
  it("escapes the characters RFC 5545 reserves", () => {
    expect(escapeText("a,b;c\\d")).toBe("a\\,b\\;c\\\\d");
  });

  it("turns newlines into literal \\n", () => {
    expect(escapeText("line one\nline two")).toBe("line one\\nline two");
  });
});

describe("fold", () => {
  it("leaves short lines alone", () => {
    expect(fold("SUMMARY:short")).toBe("SUMMARY:short");
  });

  it("folds long lines with a leading space on continuations", () => {
    const folded = fold(`SUMMARY:${"a".repeat(200)}`);
    const lines = folded.split("\r\n");
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[0].length).toBeLessThanOrEqual(75);
    expect(lines.slice(1).every((l) => l.startsWith(" "))).toBe(true);
  });

  it("never splits a multi-byte character", () => {
    const folded = fold(`SUMMARY:${"é".repeat(80)}`);
    expect(folded.replace(/\r\n /g, "")).toBe(`SUMMARY:${"é".repeat(80)}`);
  });
});

describe("toIcs", () => {
  it("wraps events in a valid calendar envelope", () => {
    const ics = toIcs([entry()], OPTS);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).toContain("VERSION:2.0");
  });

  it("uses CRLF line endings throughout", () => {
    const ics = toIcs([entry()], OPTS);
    expect(ics.split("\n").every((l) => l === "" || l.endsWith("\r"))).toBe(true);
  });

  it("writes all-day dates with an exclusive end, so a 5-day run reads as 5 days", () => {
    const ics = toIcs([entry()], OPTS);
    expect(ics).toContain("DTSTART;VALUE=DATE:20261130");
    expect(ics).toContain("DTEND;VALUE=DATE:20261205");
  });

  it("gives a single-day event a one-day span", () => {
    const ics = toIcs([entry({ date: "2026-09-08", endDate: null })], OPTS);
    expect(ics).toContain("DTSTART;VALUE=DATE:20260908");
    expect(ics).toContain("DTEND;VALUE=DATE:20260909");
  });

  it("keeps the entry id as a stable UID so re-subscribing updates rather than duplicates", () => {
    expect(toIcs([entry()], OPTS)).toContain("UID:aws-reinvent-2026-11@techcal.local");
  });

  it("marks unconfirmed entries tentative and flags them in the title", () => {
    const ics = toIcs([entry({ confidence: "rumored" })], OPTS);
    expect(ics).toContain("STATUS:TENTATIVE");
    expect(ics).toContain("[rumored]");
  });

  it("marks a cancelled entry cancelled", () => {
    expect(toIcs([entry({ status: "cancelled" })], OPTS)).toContain("STATUS:CANCELLED");
  });

  it("escapes a comma in the location instead of splitting the property", () => {
    expect(toIcs([entry()], OPTS)).toContain("LOCATION:Las Vegas\\, NV");
  });

  it("omits LOCATION when there is none", () => {
    expect(toIcs([entry({ location: null })], OPTS)).not.toContain("LOCATION:");
  });

  it("emits one VEVENT per entry", () => {
    const ics = toIcs([entry(), entry({ id: "b-2026-09" })], OPTS);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
  });

  it("produces a valid empty calendar when nothing matches the filters", () => {
    const ics = toIcs([], OPTS);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).not.toContain("BEGIN:VEVENT");
  });
});

describe("safeUri", () => {
  it("passes an ordinary http(s) URL through", () => {
    expect(safeUri("https://example.com/a?b=c#d")).toBe("https://example.com/a?b=c#d");
    expect(safeUri("http://example.com/")).toBe("http://example.com/");
  });

  it("rejects anything carrying a control character or a space", () => {
    expect(safeUri("https://e.com/\r\nX-EVIL:1")).toBeNull();
    expect(safeUri("https://e.com/\nSUMMARY:x")).toBeNull();
    expect(safeUri("https://e.com/a b")).toBeNull();
  });

  it("rejects schemes that are not http(s)", () => {
    expect(safeUri("javascript:alert(1)")).toBeNull();
    expect(safeUri("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeUri("")).toBeNull();
  });
});

describe("toIcs URL injection", () => {
  // RFC 5545 gives URI values no escaping, so a CR/LF in one would end the
  // property and let the rest be parsed as fresh iCalendar lines.
  const hostile =
    "https://e.com/\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nUID:evil@x\r\nDTSTAMP:20260901T000000Z\r\n" +
    "DTSTART;VALUE=DATE:20260902\r\nDTEND;VALUE=DATE:20260903\r\nSUMMARY:Re-enter your password";

  /**
   * What a calendar client actually sees: continuation lines (CRLF + space)
   * rejoined, then split into properties. Counting raw substrings would score
   * escaped text inside a DESCRIPTION as if it were a real property.
   */
  const properties = (ics: string) => ics.replace(/\r\n /g, "").split("\r\n");

  const hostileIcs = () =>
    toIcs([entry({ sources: [{ url: hostile, title: "t", publisher: "p" }] })], OPTS);

  it("cannot be made to emit a second event through a source URL", () => {
    const props = properties(hostileIcs());
    expect(props.filter((l) => l === "BEGIN:VEVENT")).toHaveLength(1);
    expect(props.filter((l) => l === "END:VEVENT")).toHaveLength(1);
    expect(props.filter((l) => l.startsWith("UID:"))).toEqual(["UID:aws-reinvent-2026-11@techcal.local"]);
    expect(props.some((l) => l.startsWith("SUMMARY:Re-enter"))).toBe(false);
  });

  it("drops the URL property rather than emitting an unsafe one", () => {
    const props = properties(hostileIcs());
    expect(props.some((l) => l.startsWith("URL:"))).toBe(false);
    // The rest of the event still renders — one bad source does not lose the entry.
    expect(props).toContain("SUMMARY:AWS — AWS re:Invent");
  });

  it("keeps the URL property for a well-formed source", () => {
    expect(properties(toIcs([entry()], OPTS))).toContain("URL:https://reinvent.awsevents.com/");
  });

  it("neutralises the payload where it survives inside DESCRIPTION", () => {
    const description = properties(hostileIcs()).find((l) => l.startsWith("DESCRIPTION:"))!;
    // Present, but as one escaped value on a single property line.
    expect(description).toContain("BEGIN:VEVENT");
    expect(description).toContain("\\n");
    expect(description).not.toMatch(/\r|\n/);
  });
});
