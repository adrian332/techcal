#!/usr/bin/env tsx
// Writes the subscribable .ics feeds into public/feeds/ so the static build can
// serve them as files. A static host cannot filter a feed per request, so the
// filters worth having — everything, and one per topic — are baked at build.
import fs from "node:fs";
import path from "node:path";
import { loadEntries } from "../src/lib/data";
import { toIcs } from "../src/lib/ics";
import { TOPICS } from "../src/lib/schema";
import { TOPIC_LABEL } from "../src/components/topic";

const outDir = path.join(process.cwd(), "public", "feeds");
fs.mkdirSync(outDir, { recursive: true });

const entries = loadEntries().filter((e) => e.status !== "superseded");

const feeds: { file: string; name: string; entries: typeof entries }[] = [
  { file: "techcal.ics", name: "TechCal", entries },
  ...TOPICS.map((topic) => ({
    file: `${topic}.ics`,
    name: `TechCal · ${TOPIC_LABEL[topic]}`,
    entries: entries.filter((e) => e.topics.includes(topic)),
  })),
];

for (const feed of feeds) {
  fs.writeFileSync(path.join(outDir, feed.file), toIcs(feed.entries, { name: feed.name }));
  console.log(`feeds/${feed.file}  ${feed.entries.length} entries`);
}
