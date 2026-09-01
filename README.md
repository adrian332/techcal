# TechCal

A calendar of what tech is doing, by the day. A cloud Claude Code routine
researches the internet every morning and commits what it found; GitHub Actions
rebuilds the site from that commit and publishes it to
**https://adrian332.github.io/techcal/**.

Two kinds of thing land on a date:

- **Scheduled events** — keynotes, conferences, launch dates, version releases,
  EOL and deprecation deadlines. Filed on the day they happen, up to 12 months out.
- **Announcements** — notable things that were announced, filed on the day they
  were announced. Kept for 60 days, then pruned.

Eight lanes: `ai`, `models`, `devtools`, `cloud`, `mobile`, `hardware`, `bigtech`,
`security`. `routine/PROMPT.md` defines where the boundaries are.

## How the pieces fit

```
cloud routine (daily, 06:47 SGT)          GitHub Actions (on every push)
  reads routine/PROMPT.md                   npm ci
  web research                              validate:data  ← a bad commit
  writes findings.json                      npm test          stops here
  scripts/apply-findings.ts                 build:static → out/
  → data/events/*.json + data/runs/*.json   deploy to Pages
  git push ──────────────────────────────►  adrian332.github.io/techcal
```

`data/**.json` in git is the source of truth, and it is the *only* input the
site has: the pages read those files at build time and ship the corpus with the
page, so every filter, search and month change happens in the browser. That is
what lets a Next.js app live on static hosting with no server behind it.

The routine never hand-edits data files. It produces `findings.json`, and
`scripts/apply-findings.ts` does the id derivation, merging, pruning, manifest
and run log. That code is unit-tested; a language model's bookkeeping is not.

## Everyday commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Serve the calendar on :8050 (dev) |
| `npm run build:static` | Build the public site into `out/` exactly as CI does |
| `npm run sync` | Pull the routine's commits and validate them |
| `npm run feeds` | Regenerate the `.ics` feeds under `public/feeds/` |
| `npm run validate:data` | Check every data file against the schema |
| `npm test` | Unit suite (143 tests) |
| `npm run install-agent` | Install the daily launchd pull (08:12) |
| `npm run apply -- findings.json --dry-run` | Preview a findings file without writing |

Running locally is just `npm run dev` — the page re-reads `data/` on every
request, so a `git pull` shows up on the next refresh.

## Deployment

`.github/workflows/pages.yml` publishes on every push to `main`, which in
practice means every morning when the routine commits. It validates the data and
runs the tests first, so a malformed data commit leaves the previous build
published rather than replacing it with a broken one.

The public site is served from `/techcal`, so the static build sets a
`basePath`. `TECHCAL_STATIC=1` turns on the export; `TECHCAL_BASE_PATH`
overrides the prefix (CI derives it from the repo name). Neither is set locally,
which is why `npm run dev` serves from `/`.

## Changing what the routine does

Edit **`routine/PROMPT.md`** and commit. The cloud routine's own prompt is only
a stub that says "read `routine/PROMPT.md` and follow it" — so the behaviour is
version-controlled, reviewable, and changed without touching the trigger.

Add or retire sources in **`routine/sources.md`**.

## Checking on the routine

- On the site: **/changes** shows what each run added, corrected and pruned,
  plus any source that failed to respond. A run that found nothing but logged
  its queries is healthy; a run with an empty query list is not.
- The masthead carries two dates: `researched` is the routine's last run,
  `built` is when this copy of the page was rendered. If they drift apart, the
  routine has stopped and the deploy has not.
- From Claude Code: `RemoteTrigger` with `action: "list_runs"`, then
  `action: "get_run_log"` on a session id.
- Pause or delete the routine at https://claude.ai/code/routines

## Subscribing from a real calendar app

The feeds are files written at build time, one for everything and one per topic:

```
https://adrian332.github.io/techcal/feeds/techcal.ics
https://adrian332.github.io/techcal/feeds/ai.ics
https://adrian332.github.io/techcal/feeds/bigtech.ics
https://adrian332.github.io/techcal/feeds/devtools.ics
https://adrian332.github.io/techcal/feeds/security.ics
```

Add one as a calendar *subscription* and it refreshes with each daily run.
Unconfirmed entries come through as `TENTATIVE` and are prefixed `[expected]` or
`[rumored]` in the title, so a rumour never looks like a commitment.

A static host cannot narrow a feed per request, which is why these are fixed
files rather than the query string the UI uses.

## Data model

One file per month, `data/events/YYYY-MM.json`. Every entry carries at least one
source URL, a `confidence` level, and `firstSeen` / `lastVerified` stamps. Ids
are derived from org + title + a date bucket, and an event that slips by up to
75 days is recognised as the same event rather than filed twice — see
`src/lib/id.ts` and `src/lib/merge.ts`.

`src/lib/select.ts` is the whole query layer: filtering, prefix search and
ordering over the loaded corpus, as pure functions. It runs identically at build
time and in the browser.

## Known gaps

- The calendar is only as good as the routine's judgement about what deserves a
  date. Expect to prune the sources list after a few weeks of real runs.
- Search is prefix matching, not stemming — "conference" will not find
  "conferences".
