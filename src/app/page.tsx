import Link from "next/link";
import { Filters } from "@/components/Filters";
import { Horizon } from "@/components/Horizon";
import { Legend } from "@/components/Legend";
import { Masthead } from "@/components/Masthead";
import { MonthBoard } from "@/components/MonthBoard";
import { SyncButton } from "@/components/SyncButton";
import { DayPanel } from "@/components/DayPanel";
import { EntryPanel } from "@/components/EntryPanel";
import { EntryRow } from "@/components/EntryRow";
import {
  entryEnd,
  formatDayShort,
  monthGrid,
  monthLabel,
  relativeDay,
  shiftMonth,
  spansDay,
  todayISO,
} from "@/lib/calendar";
import { isFiltered, parseFilters, withParam, type SearchParams } from "@/lib/filters";
import { entriesInRange, entryById, upcoming } from "@/lib/query";

export const dynamic = "force-dynamic";

const HORIZON_MONTHS = 13;

export default async function Home({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const today = todayISO();
  const view = params.view === "agenda" ? "agenda" : "board";

  const month = typeof params.month === "string" && /^\d{4}-\d{2}$/.test(params.month)
    ? params.month
    : today.slice(0, 7);
  const selectedDay = typeof params.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.day) ? params.day : null;
  // An entry opens in the sidebar over the calendar. If it has fallen out of the
  // window since the link was made, fall back to whatever else the sidebar had.
  const selectedEntryId = typeof params.entry === "string" ? params.entry : null;
  const selectedEntry = selectedEntryId ? entryById(selectedEntryId) : null;

  const { days } = monthGrid(month);
  const monthEntries = entriesInRange(days[0], days[days.length - 1], filters);

  const horizonStart = shiftMonth(today.slice(0, 7), -1);
  const horizonEnd = shiftMonth(horizonStart, HORIZON_MONTHS);
  const horizonEntries = entriesInRange(`${horizonStart}-01`, `${horizonEnd}-01`, filters);
  const horizonMonths = Array.from({ length: HORIZON_MONTHS }, (_, i) => shiftMonth(horizonStart, i));

  const dayEntries = selectedDay ? monthEntries.filter((e) => spansDay(e, selectedDay)) : [];
  const agenda = view === "agenda" ? upcoming(today, 120, filters) : [];
  const sidebarOpen = Boolean(selectedEntry || selectedDay);

  const sidebar = selectedEntry ? (
    <EntryPanel entry={selectedEntry} today={today} params={params} backToDay={selectedDay} />
  ) : selectedDay ? (
    <DayPanel day={selectedDay} entries={dayEntries} today={today} params={params} />
  ) : null;

  return (
    <div className="shell">
      <Masthead>
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
        <SyncButton />
        <a className="btn" href="/api/ics" download="techcal.ics">
          Subscribe
        </a>
      </Masthead>

      <Horizon
        entries={horizonEntries}
        months={horizonMonths}
        currentMonth={month}
        href={(m) => withParam({ ...params, month: m }, "day", null) || `?month=${m}`}
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
  entries: Awaited<ReturnType<typeof upcoming>>;
  today: string;
  filtered: boolean;
  params: SearchParams;
}) {
  const byDay = new Map<string, typeof entries>();
  for (const entry of entries) {
    const key = entry.date < today && entryEnd(entry) >= today ? today : entry.date;
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(entry);
  }

  if (byDay.size === 0) {
    return (
      <div className="panel">
        <p className="empty">
          {filtered ? "Nothing ahead matches these filters. Clear one and try again." : "Nothing scheduled yet — the daily routine has not filed anything."}
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
