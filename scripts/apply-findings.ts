#!/usr/bin/env tsx
// Applies a research run's findings.json to the corpus: derives ids, merges
// against what is already known, prunes the window, and files the run log.
// Usage: npx tsx scripts/apply-findings.ts findings.json [--dry-run]
import fs from "node:fs";
import path from "node:path";
import { applyFindings, findingsFileSchema } from "../src/lib/apply";
import { buildManifest, loadEntries, RUNS_DIR, writeEntries, writeManifest } from "../src/lib/data";

const [, , fileArg, ...flags] = process.argv;
const dryRun = flags.includes("--dry-run");

if (!fileArg) {
  console.error("usage: tsx scripts/apply-findings.ts <findings.json> [--dry-run]");
  process.exit(2);
}

const parsed = findingsFileSchema.safeParse(JSON.parse(fs.readFileSync(path.resolve(fileArg), "utf8")));
if (!parsed.success) {
  console.error("findings file is not valid:");
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join(".") || "(root)"} — ${issue.message}`);
  }
  process.exit(1);
}

const file = parsed.data;
const existing = loadEntries();
const result = applyFindings(existing, file, file.date);

console.log(
  `${file.entries.length} finding(s) → +${result.added.length} added, ${result.updated.length} updated, ` +
    `−${result.pruned.length} pruned, ${result.entries.length} total`,
);
for (const id of result.added) console.log(`  + ${id}`);
for (const id of result.updated) console.log(`  ~ ${id}`);
for (const id of result.pruned) console.log(`  − ${id}`);

if (dryRun) {
  console.log("\ndry run — nothing written");
  process.exit(0);
}

writeEntries(result.entries);
writeManifest(buildManifest(result.entries, file.date));
fs.mkdirSync(RUNS_DIR, { recursive: true });
fs.writeFileSync(path.join(RUNS_DIR, `${file.date}.json`), `${JSON.stringify(result.runLog, null, 2)}\n`);
console.log(`\nwritten. run log: data/runs/${file.date}.json`);
