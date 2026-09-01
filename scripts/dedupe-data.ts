#!/usr/bin/env tsx
// Folds together entries already on file that the current matcher considers the
// same thing. The daily merge only ever compares incoming findings against the
// corpus, so a pair that was filed twice before the matcher could see through
// the difference stays filed twice forever. Re-run this after any change to
// isSameThing.
//
//   npm run dedupe -- --dry-run
import { loadEntries, buildManifest, loadManifest, writeEntries, writeManifest } from "../src/lib/data";
import { isSameThing } from "../src/lib/id";
import { mergeEntry } from "../src/lib/merge";
import type { Entry } from "../src/lib/schema";

const dryRun = process.argv.includes("--dry-run");
const entries = loadEntries();

/** The older record keeps the identity; the other is folded in as if it had just arrived. */
function order(a: Entry, b: Entry): [Entry, Entry] {
  if (a.firstSeen !== b.firstSeen) return a.firstSeen < b.firstSeen ? [a, b] : [b, a];
  return a.lastVerified <= b.lastVerified ? [a, b] : [b, a];
}

const kept: Entry[] = [];
const dropped: { id: string; into: string }[] = [];

for (const entry of entries) {
  const index = kept.findIndex((k) => isSameThing(k, entry));
  if (index === -1) {
    kept.push(entry);
    continue;
  }
  const [base, incoming] = order(kept[index], entry);
  kept[index] = mergeEntry(base, incoming);
  dropped.push({ id: incoming.id, into: base.id });
}

for (const d of dropped) console.log(`merged ${d.id}\n    into ${d.into}`);
console.log(`\n${entries.length} entries -> ${kept.length} (${dropped.length} folded in)`);

if (dryRun) {
  console.log("dry run — nothing written");
} else if (dropped.length) {
  writeEntries(kept);
  writeManifest(buildManifest(kept, loadManifest()?.lastRun ?? null));
  console.log("data/ rewritten");
}
