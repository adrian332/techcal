import { Suspense } from "react";
import { CalendarBoard } from "@/components/CalendarBoard";
import { CalendarView } from "@/components/CalendarView";
import { todayISO } from "@/lib/calendar";
import { loadEntries, loadManifest } from "@/lib/data";

/**
 * The data files are read once, at build. Everything the calendar does with
 * them — filtering, search, which month, which entry is open — happens in the
 * browser, so the page can be a static file on GitHub Pages.
 *
 * The fallback is the unfiltered board rather than a spinner: reading the query
 * string is client-only, so without it the prerendered HTML would be blank.
 */
export default function Home() {
  const entries = loadEntries();
  const lastRun = loadManifest()?.lastRun ?? null;
  const builtOn = todayISO();
  const props = { entries, lastRun, builtOn, buildToday: builtOn };

  return (
    <Suspense fallback={<CalendarBoard {...props} params={{}} />}>
      <CalendarView {...props} />
    </Suspense>
  );
}
