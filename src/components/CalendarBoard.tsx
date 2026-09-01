"use client";

import Link from "next/link";
import { DayPanel } from "./DayPanel";
import { EntryPanel } from "./EntryPanel";
import { EntryRow } from "./EntryRow";
import { Filters } from "./Filters";
import { Horizon } from "./Horizon";
import { Legend } from "./Legend";
import { Masthead } from "./Masthead";
import { MonthBoard } from "./MonthBoard";
import { SubscribeMenu } from "./SubscribeMenu";
import {
  entryEnd,
  formatDayShort,
  monthGrid,
  monthLabel,
  relativeDay,
  shiftMonth,
  spansDay,
} from "@/lib/calendar";
import { isFiltered, parseFilters, withParam, type SearchParams } from "@/lib/filters";
import { selectById, selectInRange, selectUpcoming } from "@/lib/select";
import { useToday } from "@/lib/use-today";
import type { Entry } from "@/lib/schema";

const HORIZON_MONTHS = 13;

export type CalendarProps = {
  entries: Entry[];
  params: SearchParams;
  lastRun: string | null;
  builtOn: string;
  buildToday: string;
};

/**
 * The whole calendar, as a function of its query string. Kept free of
 * `useSearchParams` so it can also be prerendered with no params at all — see
 * CalendarView, which is the same board wired to the live URL.
 */
export function CalendarBoard({ entries, params, lastRun, builtOn, buildToday }: CalendarProps) {
  // The build's date is only a placeholder until the browser says what day it
  // actually is — otherwise a page built last week still highlights last week.
  const today = useToday(buildToday);

  const filters = parseFilters(params);
  const view = params.view === "agenda" ? "agenda" : "board";

  const month =
    typeof params.month === "string" && /^\d{4}-\d{2}$/.test(params.month)
      ? params.month
      : today.slice(0, 7);
  const selectedDay =
    typeof params.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.day) ? params.day : null;
  // An entry opens in the sidebar over the calendar. If it has fallen out of the
  // window since the link was made, fall back to whatever else the sidebar had.
  const selectedEntryId = typeof params.entry === "string" ? params.entry : null;
  const selectedEntry = selectedEntryId ? selectById(entries, selectedEntryId) : null;

  const { days } = monthGrid(month);
  const monthEntries = selectInRange(entries, days[0], days[days.length - 1], filters);

  const horizonStart = shiftMonth(today.slice(0, 7), -1);
  const horizonEnd = shiftMonth(horizonStart, HORIZON_MONTHS);
  const horizonEntries = selectInRange(entries, `${horizonStart}-01`, `${horizonEnd}-01`, filters);
  const horizonMonths = Array.from({ length: HORIZON_MONTHS }, (_, i) => shiftMonth(horizonStart, i));

  const dayEntries = selectedDay ? monthEntries.filter((e) => spansDay(e, selectedDay)) : [];
  const agenda = view === "agenda" ? selectUpcoming(entries, today, 120, filters) : [];
  const sidebarOpen = Boolean(selectedEntry || selectedDay);

  const sidebar = selectedEntry ? (
    <EntryPanel entry={selectedEntry} today={today} params={params} backToDay={selectedDay} />
  ) : selectedDay ? (
    <DayPanel day={selectedDay} entries={dayEntries} today={today} params={params} />
  ) : null;

  return (
    <div className="shell">
      <Masthead lastRun={lastRun} builtOn={builtOn}>
        <div className="segmented">
          <Link href={withParam(params, "view", null)} className="btn" aria-current={view === "board"} scroll={false}>
            Board
          </Link>
          <Link href={withParam(params, "view", "agenda")} className="btn" aria-current={view === "agenda"} scroll={false}>
            Agenda
          </Link>
        </div>
        <Link href="/changes" className="btn">
          Changes
        </Link>
        <SubscribeMenu />
      </Masthead>

      <Horizon
        entries={horizonEntries}
        months={horizonMonths}
        currentMonth={month}
        href={(m) => withParam({ ...params, month: m }, "day", null)}
      />

      <Filters params={params} filters={filters} />

      {view === "board" ? (
        <>
          <div className="board-head">
            <h2 className="board-title">{monthLabel(month)}</h2>
            <span className="eyebrow">
              {monthEntries.length} {monthEntries.length === 1 ? "entry" : "entries"}
              {isFiltered(filters) ? " matching" : ""}
            </span>
            <span className="segmented">
              <Link href={withParam(params, "month", shiftMonth(month, -1))} className="btn" scroll={false}>
                ← Prev
              </Link>
              <Link href={withParam(params, "month", today.slice(0, 7))} className="btn" scroll={false}>
                Today
              </Link>
              <Link href={withParam(params, "month", shiftMonth(month, 1))} className="btn" scroll={false}>
                Next →
              </Link>
            </span>
          </div>

          <div className={`layout${sidebarOpen ? " has-panel" : ""}`}>
            <div className="board-scroll">
              <MonthBoard
                month={month}
                entries={monthEntries}
                today={today}
                selectedDay={selectedDay}
                selectedEntryId={selectedEntry?.id ?? null}
                params={params}
              />
            </div>
            {sidebar}
          </div>

          <Legend />
        </>
      ) : (
        <div className={`layout${sidebarOpen ? " has-panel" : ""}`}>
          <Agenda entries={agenda} today={today} filtered={isFiltered(filters)} params={params} />
          {sidebar}
        </div>
      )}
    </div>
  );
}

function Agenda({
  entries,
  today,
  filtered,
  params,
}: {
  entries: Entry[];
  today: string;
  filtered: boolean;
  params: SearchParams;
}) {
  const byDay = new Map<string, Entry[]>();
  for (const entry of entries) {
    const key = entry.date < today && entryEnd(entry) >= today ? today : entry.date;
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(entry);
  }

  if (byDay.size === 0) {
    return (
      <div className="panel">
        <p className="empty">
          {filtered
            ? "Nothing ahead matches these filters. Clear one and try again."
            : "Nothing scheduled yet — the daily routine has not filed anything."}
        </p>
      </div>
    );
  }

  return (
    <div className="panel agenda">
      {[...byDay.entries()].map(([day, items]) => (
        <div key={day} className={`agenda-row${day === today ? " is-today" : ""}`}>
          <div className="agenda-when">
            <div className="agenda-date">{formatDayShort(day)}</div>
            <div className="agenda-rel">{relativeDay(day, today)}</div>
          </div>
          <div className="agenda-items">
            {items.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                className="agenda-item"
                href={withParam(params, "entry", entry.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
