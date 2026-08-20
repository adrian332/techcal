#!/usr/bin/env tsx
// Hand-written seed corpus so the UI can be built and tested before the daily
// routine has ever run. Dates are real, publicly-announced ones; the routine
// will correct/replace these as it verifies them.
import { deriveId } from "../src/lib/id";
import { buildManifest, writeEntries, writeManifest } from "../src/lib/data";
import type { Entry } from "../src/lib/schema";

const today = new Date().toISOString().slice(0, 10);

type Seed = Omit<Entry, "id" | "firstSeen" | "lastVerified" | "endDate" | "location" | "datePrecision" | "status"> &
  Partial<Pick<Entry, "endDate" | "location" | "datePrecision" | "status">>;

const seeds: Seed[] = [
  {
    kind: "event",
    date: "2026-09-08",
    title: "Apple fall iPhone event",
    summary: "Apple's annual September keynote, where the next iPhone generation and companion hardware are typically introduced.",
    topics: ["bigtech"],
    org: "Apple",
    location: "Apple Park, Cupertino + online",
    confidence: "expected",
    sources: [{ url: "https://www.apple.com/newsroom/", title: "Apple Newsroom", publisher: "Apple" }],
  },
  {
    kind: "event",
    date: "2026-09-15",
    endDate: "2026-09-17",
    title: "Meta Connect",
    summary: "Meta's annual developer conference covering Quest, Ray-Ban smart glasses and its AI assistant roadmap.",
    topics: ["bigtech", "ai"],
    location: "Menlo Park, CA + online",
    org: "Meta",
    confidence: "expected",
    sources: [{ url: "https://www.metaconnect.com/", title: "Meta Connect", publisher: "Meta" }],
  },
  {
    kind: "event",
    date: "2026-10-13",
    title: "Microsoft Patch Tuesday",
    summary: "Monthly Microsoft security update rollup; the practical deadline for triaging newly disclosed Windows and Office vulnerabilities.",
    topics: ["security"],
    org: "Microsoft",
    location: null,
    confidence: "confirmed",
    sources: [{ url: "https://msrc.microsoft.com/update-guide", title: "Security Update Guide", publisher: "Microsoft MSRC" }],
  },
  {
    kind: "event",
    date: "2026-10-20",
    title: "Node.js 24 enters maintenance LTS",
    summary: "Node.js 24 is scheduled to move from active LTS into maintenance, after which it receives only critical and security fixes.",
    topics: ["devtools"],
    org: "Node.js",
    location: null,
    confidence: "confirmed",
    sources: [{ url: "https://github.com/nodejs/release#release-schedule", title: "Node.js release schedule", publisher: "Node.js" }],
  },
  {
    kind: "event",
    date: "2026-11-30",
    endDate: "2026-12-04",
    title: "AWS re:Invent",
    summary: "AWS's flagship annual conference, historically the venue for its largest infrastructure and AI service launches.",
    topics: ["devtools", "ai"],
    org: "AWS",
    location: "Las Vegas, NV",
    confidence: "expected",
    sources: [{ url: "https://reinvent.awsevents.com/", title: "AWS re:Invent", publisher: "Amazon Web Services" }],
  },
  {
    kind: "event",
    date: "2026-12-06",
    endDate: "2026-12-12",
    title: "NeurIPS 2026",
    summary: "The largest annual machine-learning research conference; main-track papers and workshops set much of the following year's agenda.",
    topics: ["ai"],
    org: "NeurIPS",
    location: "TBA",
    confidence: "expected",
    sources: [{ url: "https://neurips.cc/", title: "NeurIPS", publisher: "NeurIPS Foundation" }],
  },
  {
    kind: "event",
    date: "2027-01-06",
    endDate: "2027-01-09",
    title: "CES 2027",
    summary: "The annual consumer-electronics show in Las Vegas, where most major hardware vendors set their year's product narrative.",
    topics: ["bigtech"],
    org: "CTA",
    location: "Las Vegas, NV",
    confidence: "expected",
    sources: [{ url: "https://www.ces.tech/", title: "CES", publisher: "Consumer Technology Association" }],
  },
  {
    kind: "event",
    date: "2027-03-01",
    endDate: "2027-03-04",
    title: "MWC Barcelona 2027",
    summary: "Mobile World Congress, the year's main telecom and mobile-hardware gathering.",
    topics: ["bigtech"],
    org: "GSMA",
    location: "Barcelona, Spain",
    confidence: "expected",
    sources: [{ url: "https://www.mwcbarcelona.com/", title: "MWC Barcelona", publisher: "GSMA" }],
  },
  {
    kind: "announcement",
    date: today,
    title: "TechCal seed corpus created",
    summary: "Placeholder entry marking the day this calendar was seeded by hand, before the daily research routine took over. Safe to delete.",
    topics: ["devtools"],
    org: "TechCal",
    location: null,
    confidence: "confirmed",
    sources: [{ url: "https://github.com/adrian332/techcal", title: "TechCal repository", publisher: "TechCal" }],
  },
];

const entries: Entry[] = seeds.map((s) => ({
  endDate: null,
  location: null,
  datePrecision: "day" as const,
  status: "active" as const,
  ...s,
  id: deriveId({ kind: s.kind, org: s.org, title: s.title, date: s.date }),
  firstSeen: today,
  lastVerified: today,
}));

const files = writeEntries(entries);
writeManifest(buildManifest(entries, null));
console.log(`wrote ${entries.length} fixture entries across ${files.length} file(s)`);
