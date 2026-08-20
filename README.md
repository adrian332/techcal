# TechCal

A calendar of what tech is doing, by the day. A cloud Claude Code routine
researches the internet every morning and commits what it found; this Mac pulls
those commits and serves them as a calendar on **http://localhost:8050**.

Two kinds of thing land on a date:

- **Scheduled events** — keynotes, conferences, launch dates, version releases,
  EOL and deprecation deadlines. Filed on the day they happen, up to 12 months out.
- **Announcements** — notable things that were announced, filed on the day they
  were announced. Kept for 60 days, then pruned.

Four lanes: `ai`, `bigtech`, `devtools`, `security`.

## How the pieces fit

```
cloud routine (daily, 06:47 SGT)          this Mac (daily, 08:12 SGT)
  reads routine/PROMPT.md                   launchd → npm run sync
  web research                                git pull --ff-only
  writes findings.json                        validate:data
  scripts/apply-findings.ts                   ingest → techcal.db
  → data/events/*.json + data/runs/*.json   next start → :8050
  git push
```

`data/**.json` in git is the source of truth. `techcal.db` is a rebuildable
cache — delete it and run `npm run ingest` to get it back.

The routine never hand-edits data files. It produces `findings.json`, and
`scripts/apply-findings.ts` does the id derivation, merging, pruning, manifest
and run log. That code is unit-tested; a language model's bookkeeping is not.

## Everyday commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Serve the calendar on :8050 (dev) |
| `npm run sync` | Pull the routine's commits, validate, rebuild the DB |
| `npm run ingest` | Rebuild `techcal.db` from `data/` |
| `npm run validate:data` | Check every data file against the schema |
| `npm test` | Unit suite (137 tests) |
| `npm run install-agent` | Install the daily launchd sync (08:12) |
| `npm run apply -- findings.json --dry-run` | Preview a findings file without writing |

## Changing what the routine does

Edit **`routine/PROMPT.md`** and commit. The cloud routine's own prompt is only
a stub that says "read `routine/PROMPT.md` and follow it" — so the behaviour is
version-controlled, reviewable, and changed without touching the trigger.

Add or retire sources in **`routine/sources.md`**.

## Checking on the routine

- In this app: **/changes** shows what each run added, corrected and pruned,
  plus any source that failed to respond. A run that found nothing but logged
  its queries is healthy; a run with an empty query list is not.
- From Claude Code: `RemoteTrigger` with `action: "list_runs"`, then
  `action: "get_run_log"` on a session id.
- Pause or delete the routine at https://claude.ai/code/routines

## Subscribing from a real calendar app

`/api/ics` is a filtered ICS feed and takes the same params as the UI:

```
http://localhost:8050/api/ics?topic=ai&topic=devtools&kind=event
```

Unconfirmed entries come through as `TENTATIVE` and are prefixed `[expected]` or
`[rumored]` in the title, so a rumour never looks like a commitment in your
calendar app.

## Data model

One file per month, `data/events/YYYY-MM.json`. Every entry carries at least one
source URL, a `confidence` level, and `firstSeen` / `lastVerified` stamps. Ids
are derived from org + title + a date bucket, and an event that slips by up to
75 days is recognised as the same event rather than filed twice — see
`src/lib/id.ts` and `src/lib/merge.ts`.

## Known gaps

- Nothing is deployed; this runs locally only.
- The calendar is only as good as the routine's judgement about what deserves a
  date. Expect to prune the sources list after a few weeks of real runs.
