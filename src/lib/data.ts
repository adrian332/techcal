import fs from "node:fs";
import path from "node:path";
import {
  entrySchema,
  manifestSchema,
  monthFileSchema,
  runLogSchema,
  SCHEMA_VERSION,
  type Entry,
  type Manifest,
  type RunLog,
} from "./schema";
import { groupByMonth } from "./merge";

export const DATA_DIR = path.join(process.cwd(), "data");
export const EVENTS_DIR = path.join(DATA_DIR, "events");
export const RUNS_DIR = path.join(DATA_DIR, "runs");
export const MANIFEST_PATH = path.join(DATA_DIR, "manifest.json");

function readJson(file: string): unknown {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function monthFiles(dir = EVENTS_DIR): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^\d{4}-\d{2}\.json$/.test(f))
    .sort()
    .map((f) => path.join(dir, f));
}

/** Load every month file. Throws with the offending file+path on bad data. */
export function loadEntries(dir = EVENTS_DIR): Entry[] {
  const all: Entry[] = [];
  for (const file of monthFiles(dir)) {
    const parsed = monthFileSchema.safeParse(readJson(file));
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new Error(`${path.basename(file)}: ${issue.path.join(".")} — ${issue.message}`);
    }
    all.push(...parsed.data);
  }
  return all;
}

export function writeEntries(entries: Entry[], dir = EVENTS_DIR): string[] {
  fs.mkdirSync(dir, { recursive: true });
  const grouped = groupByMonth(entries);
  const written: string[] = [];

  for (const [month, list] of grouped) {
    const file = path.join(dir, `${month}.json`);
    fs.writeFileSync(file, `${JSON.stringify(list, null, 2)}\n`);
    written.push(file);
  }
  // A month that emptied out should not linger with stale contents.
  for (const file of monthFiles(dir)) {
    if (!written.includes(file)) fs.rmSync(file);
  }
  return written;
}

export function buildManifest(entries: Entry[], lastRun: string | null): Manifest {
  const months: Record<string, number> = {};
  for (const [month, list] of groupByMonth(entries)) months[month] = list.length;
  return { schemaVersion: SCHEMA_VERSION, lastRun, months, totalEntries: entries.length };
}

export function loadManifest(file = MANIFEST_PATH): Manifest | null {
  if (!fs.existsSync(file)) return null;
  return manifestSchema.parse(readJson(file));
}

export function writeManifest(manifest: Manifest, file = MANIFEST_PATH): void {
  fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
}

export function loadRunLogs(dir = RUNS_DIR): RunLog[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort()
    .reverse()
    .map((f) => runLogSchema.parse(readJson(path.join(dir, f))));
}

export function validateEntry(value: unknown) {
  return entrySchema.safeParse(value);
}
