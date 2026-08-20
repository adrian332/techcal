import { todayISO } from "@/lib/calendar";
import { parseFilters, type SearchParams } from "@/lib/filters";
import { toIcs } from "@/lib/ics";
import { entriesInRange } from "@/lib/query";
import { addDays, addMonths } from "@/lib/merge";

export const dynamic = "force-dynamic";

/**
 * Subscribable feed of the calendar, honouring the same filters as the UI:
 * /api/ics?topic=ai&topic=security&kind=event
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const params: SearchParams = {};
  for (const key of new Set(url.searchParams.keys())) {
    params[key] = url.searchParams.getAll(key);
  }

  const filters = parseFilters(params);
  const today = todayISO();
  const entries = entriesInRange(addDays(today, -90), addMonths(today, 15), filters);

  const label = filters.topics?.length ? `TechCal · ${filters.topics.join(", ")}` : "TechCal";
  const body = toIcs(entries, { name: label });

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="techcal.ics"',
      "Cache-Control": "no-store",
    },
  });
}
