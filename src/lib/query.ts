import { openDb, rowToEntry, type DB } from "./db";
import type { Entry, Kind, Topic } from "./schema";

export type Filters = {
  topics?: Topic[];
  kinds?: Kind[];
  confidence?: Entry["confidence"][];
  search?: string;
};

let cached: DB | null = null;

/** Long-lived read connection for the Next.js server. */
export function db(): DB {
  if (!cached) cached = openDb();
  return cached;
}

/** FTS5 is punctuation-sensitive; quote each term so user input can't break the query. */
function ftsQuery(search: string): string {
  const terms = search
    .split(/\s+/)
    .map((t) => t.replace(/["*]/g, "").trim())
    .filter(Boolean)
    .map((t) => `"${t}"*`);
  return terms.join(" AND ");
}

function whereClauses(filters: Filters, params: unknown[]): string[] {
  const where: string[] = ["e.status != 'superseded'"];

  if (filters.kinds?.length) {
    where.push(`e.kind IN (${filters.kinds.map(() => "?").join(", ")})`);
    params.push(...filters.kinds);
  }
  if (filters.confidence?.length) {
    where.push(`e.confidence IN (${filters.confidence.map(() => "?").join(", ")})`);
    params.push(...filters.confidence);
  }
  if (filters.topics?.length) {
    // topics is a JSON array; match any overlap.
    where.push(`(${filters.topics.map(() => "EXISTS (SELECT 1 FROM json_each(e.topics) WHERE json_each.value = ?)").join(" OR ")})`);
    params.push(...filters.topics);
  }
  return where;
}

/** Entries overlapping [from, to] inclusive, honouring filters. */
export function entriesInRange(from: string, to: string, filters: Filters = {}, conn: DB = db()): Entry[] {
  const params: unknown[] = [];
  const where = whereClauses(filters, params);

  let sql = `SELECT e.* FROM events e`;
  if (filters.search?.trim()) {
    sql += ` JOIN events_fts f ON f.rowid = e.rowid AND events_fts MATCH ?`;
    params.unshift(ftsQuery(filters.search));
  }

  where.push(`COALESCE(e.end_date, e.date) >= ? AND e.date <= ?`);
  params.push(from, to);

  sql += ` WHERE ${where.join(" AND ")} ORDER BY e.date ASC, e.title ASC`;
  return (conn.prepare(sql).all(...params) as never[]).map(rowToEntry);
}

export function entryById(id: string, conn: DB = db()): Entry | null {
  const row = conn.prepare("SELECT * FROM events WHERE id = ?").get(id) as never;
  return row ? rowToEntry(row) : null;
}

export function upcoming(from: string, limit: number, filters: Filters = {}, conn: DB = db()): Entry[] {
  const params: unknown[] = [];
  const where = whereClauses(filters, params);

  let sql = `SELECT e.* FROM events e`;
  if (filters.search?.trim()) {
    sql += ` JOIN events_fts f ON f.rowid = e.rowid AND events_fts MATCH ?`;
    params.unshift(ftsQuery(filters.search));
  }
  where.push(`COALESCE(e.end_date, e.date) >= ?`);
  params.push(from);

  sql += ` WHERE ${where.join(" AND ")} ORDER BY e.date ASC, e.title ASC LIMIT ?`;
  params.push(limit);
  return (conn.prepare(sql).all(...params) as never[]).map(rowToEntry);
}

export function counts(conn: DB = db()): { total: number; events: number; announcements: number } {
  const row = conn
    .prepare(
      `SELECT COUNT(*) AS total,
              SUM(kind = 'event') AS events,
              SUM(kind = 'announcement') AS announcements
       FROM events WHERE status != 'superseded'`,
    )
    .get() as { total: number; events: number | null; announcements: number | null };
  return { total: row.total, events: row.events ?? 0, announcements: row.announcements ?? 0 };
}
