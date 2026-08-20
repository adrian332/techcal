#!/usr/bin/env tsx
// Validates everything under data/ against the schema. Non-zero exit on any
// problem, so the daily routine can gate its own commit on it.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { manifestSchema, monthFileSchema, runLogSchema } from "../src/lib/schema";
import { dedupeKey, deriveId } from "../src/lib/id";

const root = process.argv[2] ? path.resolve(process.argv[2]) : path.join(process.cwd(), "data");
const errors: string[] = [];
const warnings: string[] = [];

function check<T>(file: string, schema: z.ZodType<T>, label: string): T | null {
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    errors.push(`${label}: not valid JSON — ${(err as Error).message}`);
    return null;
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`${label}: ${issue.path.join(".") || "(root)"} — ${issue.message}`);
    }
    return null;
  }
  return parsed.data;
}

const eventsDir = path.join(root, "events");
const seenIds = new Map<string, string>();
const seenKeys = new Map<string, string>();
let total = 0;

const monthNames = fs.existsSync(eventsDir)
  ? fs.readdirSync(eventsDir).filter((f) => f.endsWith(".json")).sort()
  : [];

for (const name of monthNames) {
  if (!/^\d{4}-\d{2}\.json$/.test(name)) {
    errors.push(`events/${name}: filename must be YYYY-MM.json`);
    continue;
  }
  const month = name.slice(0, 7);
  const entries = check(path.join(eventsDir, name), monthFileSchema, `events/${name}`);
  if (!entries) continue;

  for (const e of entries) {
    total += 1;
    if (e.date.slice(0, 7) !== month) {
      errors.push(`events/${name}: ${e.id} is dated ${e.date}, which belongs in ${e.date.slice(0, 7)}.json`);
    }
    if (seenIds.has(e.id)) {
      errors.push(`duplicate id "${e.id}" in events/${name} and ${seenIds.get(e.id)}`);
    }
    seenIds.set(e.id, `events/${name}`);

    const key = dedupeKey(e);
    if (seenKeys.has(key)) {
      warnings.push(`possible duplicate: "${e.id}" looks like "${seenKeys.get(key)}"`);
    }
    seenKeys.set(key, e.id);

    const expected = deriveId(e);
    if (e.id !== expected) {
      warnings.push(`id "${e.id}" is not the derived id "${expected}" (fine if a title was corrected later)`);
    }
  }
}

const manifestPath = path.join(root, "manifest.json");
if (fs.existsSync(manifestPath)) {
  const manifest = check(manifestPath, manifestSchema, "manifest.json");
  if (manifest && manifest.totalEntries !== total) {
    errors.push(`manifest.json: totalEntries is ${manifest.totalEntries} but data holds ${total}`);
  }
} else {
  errors.push("manifest.json: missing");
}

const runsDir = path.join(root, "runs");
if (fs.existsSync(runsDir)) {
  for (const name of fs.readdirSync(runsDir).filter((f) => f.endsWith(".json"))) {
    if (!/^\d{4}-\d{2}-\d{2}\.json$/.test(name)) {
      errors.push(`runs/${name}: filename must be YYYY-MM-DD.json`);
      continue;
    }
    check(path.join(runsDir, name), runLogSchema, `runs/${name}`);
  }
}

for (const w of warnings) console.warn(`warn  ${w}`);
for (const e of errors) console.error(`ERROR ${e}`);

if (errors.length) {
  console.error(`\n${errors.length} error(s) across ${total} entries — do not commit until these are fixed.`);
  process.exit(1);
}
console.log(`ok — ${total} entries across ${monthNames.length} month file(s), ${warnings.length} warning(s).`);
