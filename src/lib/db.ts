import path from "node:path";
import Database from "better-sqlite3";
import type { Entry } from "./schema";

export const DB_PATH = process.env.TECHCAL_DB ?? path.join(process.cwd(), "techcal.db");

export type DB = Database.Database;

export function openDb(file = DB_PATH): DB {
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  migrate(db);
  return db;
}

/** Bumped whenever the table shape changes; the DB is a cache, so we rebuild. */
export const DB_SCHEMA_VERSION = 1;

/**
 * Joins punctuation-split words so "re:Invent" is findable as "reinvent",
 * "Node.js" as "nodejs" and ".NET" as "net". Indexed alongside the raw text,
 * so both "invent" and "reinvent" hit.
 */
export function squash(text: string): string {
  return text.replace(/[.:''&/\-]+/g, "");
}

export function migrate(db: DB): void {
  const current = db.pragma("user_version", { simple: true }) as number;
  if (current !== DB_SCHEMA_VERSION) {
    db.exec(`
      DROP TABLE IF EXISTS events_fts;
      DROP TABLE IF EXISTS events;
      DROP TABLE IF EXISTS meta;
    `);
    db.pragma(`user_version = ${DB_SCHEMA_VERSION}`);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id            TEXT PRIMARY KEY,
      kind          TEXT NOT NULL,
      date          TEXT NOT NULL,
      end_date      TEXT,
      date_precision TEXT NOT NULL,
      title         TEXT NOT NULL,
      summary       TEXT NOT NULL,
      topics        TEXT NOT NULL,
      org           TEXT NOT NULL,
      location      TEXT,
      confidence    TEXT NOT NULL,
      sources       TEXT NOT NULL,
      first_seen    TEXT NOT NULL,
      last_verified TEXT NOT NULL,
      status        TEXT NOT NULL,
      search_alt    TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS events_date_idx ON events(date);
    CREATE INDEX IF NOT EXISTS events_kind_idx ON events(kind);

    CREATE VIRTUAL TABLE IF NOT EXISTS events_fts USING fts5(
      title, summary, org, topics, search_alt,
      content='events', content_rowid='rowid', tokenize='porter unicode61'
    );

    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);
}

type Row = {
  id: string;
  kind: string;
  date: string;
  end_date: string | null;
  date_precision: string;
  title: string;
  summary: string;
  topics: string;
  org: string;
  location: string | null;
  confidence: string;
  sources: string;
  first_seen: string;
  last_verified: string;
  status: string;
  search_alt: string;
};

export function rowToEntry(row: Row): Entry {
  return {
    id: row.id,
    kind: row.kind as Entry["kind"],
    date: row.date,
    endDate: row.end_date,
    datePrecision: row.date_precision as Entry["datePrecision"],
    title: row.title,
    summary: row.summary,
    topics: JSON.parse(row.topics),
    org: row.org,
    location: row.location,
    confidence: row.confidence as Entry["confidence"],
    sources: JSON.parse(row.sources),
    firstSeen: row.first_seen,
    lastVerified: row.last_verified,
    status: row.status as Entry["status"],
  };
}

/**
 * Replace the table contents with `entries`. The JSON files are the source of
 * truth, so anything not in them is gone — including entries the routine pruned.
 * FTS is rebuilt from scratch rather than kept in sync by trigger; the corpus is
 * a few thousand rows at most and a rebuild is both cheap and unambiguous.
 */
export function replaceAll(db: DB, entries: Entry[], lastSync: string): number {
  const insert = db.prepare(`
    INSERT INTO events (id, kind, date, end_date, date_precision, title, summary,
                        topics, org, location, confidence, sources, first_seen,
                        last_verified, status, search_alt)
    VALUES (@id, @kind, @date, @end_date, @date_precision, @title, @summary,
            @topics, @org, @location, @confidence, @sources, @first_seen,
            @last_verified, @status, @search_alt)
  `);

  const run = db.transaction((list: Entry[]) => {
    db.prepare("DELETE FROM events").run();
    for (const e of list) {
      insert.run({
        id: e.id,
        kind: e.kind,
        date: e.date,
        end_date: e.endDate,
        date_precision: e.datePrecision,
        title: e.title,
        summary: e.summary,
        topics: JSON.stringify(e.topics),
        org: e.org,
        location: e.location,
        confidence: e.confidence,
        sources: JSON.stringify(e.sources),
        first_seen: e.firstSeen,
        last_verified: e.lastVerified,
        status: e.status,
        search_alt: squash(`${e.title} ${e.summary} ${e.org} ${e.location ?? ""}`),
      });
    }
    db.exec("INSERT INTO events_fts(events_fts) VALUES('rebuild')");
    db.prepare("INSERT INTO meta (key, value) VALUES ('lastSync', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(lastSync);
  });

  run(entries);
  return entries.length;
}

export function getMeta(db: DB, key: string): string | null {
  const row = db.prepare("SELECT value FROM meta WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? null;
}
