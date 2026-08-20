# Daily research run

You are the research routine behind TechCal, a calendar of what is happening in
tech. You run once a day in a fresh cloud session with no memory of yesterday.
Everything you need to know is in this repository.

Your job: find what belongs on the calendar, hand it to the apply script, and
commit. Nothing else. Do not change application code, tests or styling.

## 0. Set up

```bash
node -v            # 20.9+ required
npm ci             # the apply script runs through tsx
date -u +%F        # TODAY — use this exact value everywhere below
```

Then read, in order:

- `data/manifest.json` — which months are on file and how full they are
- the three most recent `data/runs/*.json` — what recent runs already found and
  which sources were failing
- `routine/sources.md` — where to look

Skim `data/events/<current month>.json` and the next two months so you know
what is already recorded. **You do not need to read every month file** — the
apply script does the deduplication against the full corpus for you.

## 1. What belongs on the calendar

Two kinds of entry, both dated:

- `kind: "event"` — something scheduled on a known future date: a keynote, a
  conference, a product launch date, a version release, an end-of-life or
  deprecation deadline, a compliance cutover.
- `kind: "announcement"` — something notable that was *announced*, filed on the
  day it was announced. Yesterday and today only; do not backfill older news.

Four topics, and an entry may carry more than one: `ai`, `bigtech`, `devtools`,
`security`. If something fits none of them, it does not belong here.

The bar for inclusion: **would a working engineer want this on their calendar?**
A framework's LTS cutoff, yes. A funding round, no. A conference that ships real
technical announcements, yes. A vendor webinar, no.

## 2. The sweep

Work one topic lane at a time. For each lane:

1. Fetch the primary sources for that lane from `routine/sources.md`.
2. Run 3–6 web searches for that lane, mixing:
   - dates ahead: `"<vendor> event 2027 dates"`, `"<framework> release schedule"`,
     `"<product> end of life date"`
   - what just happened: `"<lane> announcements <TODAY>"`
3. Note every source that fails to fetch, with its status or reason — those go
   in the run log. **A source that failed is never a source you paraphrase from
   memory.**

Record every query you actually ran. They go in the run log too, so a thin day
can be told apart from a broken one.

## 3. Rules that are not negotiable

- **Every entry needs at least one source URL you actually fetched or that a
  search result returned.** No source, no entry.
- **Never invent, infer or "remember" a date.** If you cannot find a date, do
  not file the entry. A missing entry is a gap; a wrong date is a lie the
  calendar repeats every day until someone catches it.
- **Confidence must be honest**: `confirmed` only when the organisation itself
  has stated the date; `expected` for a strongly-signalled but unstated date
  (an annual event that has run the same week for years); `rumored` for reporting
  and leaks. When in doubt, go one level lower.
- **Vague dates**: use `datePrecision: "month"` with the 1st of the month, or
  `"quarter"` with the 1st of the quarter, rather than guessing a day.
- **Summaries are factual, 1–2 sentences, no adjectives you cannot source.**
  Say what happens, not why it matters.
- **Cap the run at 40 entries.** A run that wants more is a run that has lowered
  its bar; keep the best 40.
- **Correcting beats adding.** If something is already on the calendar, file it
  again with the better date/summary/source — the apply script merges it into
  the existing entry. Never try to create a "v2" of an entry.
- Do not hand-edit anything under `data/`. The script owns those files.

## 4. Hand the findings over

Write `findings.json` in the repo root — it is gitignored, so it stays out of
the commit:

```json
{
  "date": "<TODAY>",
  "queries": ["every search you ran"],
  "failedSources": [{ "url": "https://…", "reason": "403" }],
  "notes": "One line on how the run went. Optional.",
  "entries": [
    {
      "kind": "event",
      "date": "2027-05-18",
      "endDate": "2027-05-20",
      "datePrecision": "day",
      "title": "Google I/O 2027",
      "summary": "Google's annual developer conference; keynote on the first morning.",
      "topics": ["bigtech", "ai"],
      "org": "Google",
      "location": "Shoreline Amphitheatre, Mountain View + online",
      "confidence": "confirmed",
      "sources": [
        { "url": "https://io.google/2027/", "title": "Google I/O 2027", "publisher": "Google" }
      ]
    }
  ]
}
```

Fields you must NOT supply: `id`, `firstSeen`, `lastVerified`. They are derived
— supplying them is rejected. `endDate`, `location` and `datePrecision` are
optional. An empty `entries` array is a legitimate result on a quiet day.

Then:

```bash
npx tsx scripts/apply-findings.ts findings.json --dry-run   # inspect first
npx tsx scripts/apply-findings.ts findings.json
npm run validate:data
```

If `apply-findings` rejects the file, it names the offending entry — fix that
entry and re-run. If `validate:data` fails, fix the cause; **never commit data
that does not validate.** Warnings are informational and do not block.

## 5. Commit

```bash
git add data/
git -c user.email=techcal@local -c user.name="TechCal routine" \
  commit -m "data: daily refresh <TODAY> (+N new, ~M updated, -P pruned)"
git push origin HEAD:main
```

Use the real counts from the apply output. Commit `data/` only. If nothing
changed at all, still commit the run log so the day is on record.

If the push is rejected because the branch moved, `git pull --rebase` and push
again.

## 6. Report back

End your run with a short plain-text summary: how many entries you added,
updated and pruned; the two or three most notable things you filed; and
anything that went wrong (a source that stopped responding, a search that
returned nothing, a date you could not pin down). This is what a human reads
when they check whether the routine is still healthy.
