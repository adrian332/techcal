#!/usr/bin/env tsx
// Loads data/**/*.json into techcal.db. Idempotent: the JSON files are the
// source of truth and the table is replaced wholesale on every run.
import { loadEntries, loadManifest } from "../src/lib/data";
import { openDb, replaceAll } from "../src/lib/db";

const entries = loadEntries();
const manifest = loadManifest();
const now = new Date().toISOString();

const db = openDb();
const count = replaceAll(db, entries, now);
db.close();

const lastRun = manifest?.lastRun ?? "never";
console.log(`ingested ${count} entries (last routine run: ${lastRun})`);
