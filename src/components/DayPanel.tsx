import Link from "next/link";
import { formatDay, relativeDay } from "@/lib/calendar";
import { withParam, type SearchParams } from "@/lib/filters";
import type { Entry } from "@/lib/schema";
import { EntryRow } from "./EntryRow";

type Props = { day: string; entries: Entry[]; today: string; params: SearchParams };

export function DayPanel({ day, entries, today, params }: Props) {
  return (
    <aside className="side">
      <div className="panel">
        <div className="side-head">
          <div>
            <p className="eyebrow" style={{ margin: "0 0 2px" }}>
              {relativeDay(day, today)}
            </p>
            <h2 className="side-date">{formatDay(day)}</h2>
          </div>
          <Link href={withParam(params, "day", null)} className="btn" scroll={false} aria-label="Close day">
            Close
          </Link>
        </div>

        {entries.length === 0 ? (
          <p className="empty">Nothing on this day. Pick another, or widen the filters.</p>
        ) : (
          <div className="side-list">
            {entries.map((entry) => (
              <EntryRow key={entry.id} entry={entry} href={withParam(params, "entry", entry.id)} />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
