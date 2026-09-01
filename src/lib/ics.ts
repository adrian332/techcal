import { entryEnd } from "./calendar";
import type { Entry } from "./schema";

const CRLF = "\r\n";

/** RFC 5545 §3.3.4 DATE value: no separators. */
function icsDate(date: string): string {
  return date.replace(/-/g, "");
}

function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return icsDate(d.toISOString().slice(0, 10));
}

/** RFC 5545 §3.3.11: escape , ; \ and newlines in TEXT values. */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** RFC 5545 §3.1: fold lines at 75 octets, continuation lines start with a space. */
export function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;

  const chunks: string[] = [];
  let start = 0;
  let limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    // Never split a multi-byte character across a fold.
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end -= 1;
    chunks.push(bytes.subarray(start, end).toString("utf8"));
    start = end;
    limit = 74; // continuation lines carry a leading space
  }
  return chunks.join(`${CRLF} `);
}

/**
 * RFC 5545 defines no escaping for a URI value — whatever is written after
 * `URL:` is taken literally, so a control character in it would terminate the
 * property and let the rest be read as new iCalendar lines. The schema already
 * rejects those, but this is the sink: anything that is not a clean http(s)
 * URL is dropped rather than emitted and hoped about.
 */
export function safeUri(value: string): string | null {
  return /^https?:\/\/[^\u0000-\u0020\u007f]+$/i.test(value) ? value : null;
}

export type IcsOptions = { name?: string; stamp?: string };

export function toIcs(entries: Entry[], options: IcsOptions = {}): string {
  const name = options.name ?? "TechCal";
  const stamp = options.stamp ?? `${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TechCal//Tech events calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    "X-WR-TIMEZONE:UTC",
  ];

  for (const e of entries) {
    const marker = e.confidence === "confirmed" ? "" : `[${e.confidence}] `;
    const url = safeUri(e.sources[0]?.url ?? "");
    const description = [
      e.summary,
      "",
      `Topics: ${e.topics.join(", ")}`,
      `Confidence: ${e.confidence}`,
      ...e.sources.map((s) => `${s.publisher}: ${s.url}`),
    ].join("\n");

    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@techcal.local`,
      `DTSTAMP:${stamp}`,
      // All-day events: DTEND is exclusive, so it lands on the day after.
      `DTSTART;VALUE=DATE:${icsDate(e.date)}`,
      `DTEND;VALUE=DATE:${nextDay(entryEnd(e))}`,
      fold(`SUMMARY:${escapeText(`${marker}${e.org} — ${e.title}`)}`),
      fold(`DESCRIPTION:${escapeText(description)}`),
      ...(e.location ? [fold(`LOCATION:${escapeText(e.location)}`)] : []),
      ...(url ? [fold(`URL:${url}`)] : []),
      `CATEGORIES:${e.topics.map((t) => t.toUpperCase()).join(",")}`,
      `STATUS:${e.status === "cancelled" ? "CANCELLED" : e.confidence === "confirmed" ? "CONFIRMED" : "TENTATIVE"}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join(CRLF) + CRLF;
}
