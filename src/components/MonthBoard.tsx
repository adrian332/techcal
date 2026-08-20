import Link from "next/link";
import { monthGrid, packWeek, WEEKDAYS_SHORT } from "@/lib/calendar";
import { withParam, type SearchParams } from "@/lib/filters";
import type { Entry } from "@/lib/schema";
import { primaryTopic, topicVar } from "./topic";

const MAX_LANES = 3;

type Props = {
  month: string;
  entries: Entry[];
  today: string;
  selectedDay: string | null;
  params: SearchParams;
};

export function MonthBoard({ month, entries, today, selectedDay, params }: Props) {
  const { weeks } = monthGrid(month);

  return (
    <div className="board">
      <div className="board-weekdays" aria-hidden="true">
        {WEEKDAYS_SHORT.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      {weeks.map((week) => {
        const segments = packWeek(week, entries);
        const visible = segments.filter((s) => s.lane < MAX_LANES);
        const overflow = segments.length - visible.length;

        return (
          <div className="week" key={week[0]}>
            <div className="week-days">
              {week.map((day) => {
                const outside = day.slice(0, 7) !== month;
                const classes = ["day-head"];
                if (outside) classes.push("is-outside");
                if (day === today) classes.push("is-today");

                return (
                  <div key={day} className={classes.join(" ")}>
                    <span className="day-num">{Number(day.slice(8))}</span>
                    <Link
                      href={withParam(params, "day", day === selectedDay ? null : day)}
                      className="day-link"
                      aria-label={`Entries on ${day}`}
                      scroll={false}
                    />
                  </div>
                );
              })}
            </div>

            <div className="week-lanes">
              {visible.map((seg) => {
                const topic = primaryTopic(seg.entry);
                const classes = ["bar"];
                if (seg.entry.confidence === "expected") classes.push("is-expected");
                if (seg.entry.confidence === "rumored") classes.push("is-rumored");
                if (seg.continuesBefore) classes.push("continues-before");
                if (seg.continuesAfter) classes.push("continues-after");

                return (
                  <Link
                    key={seg.entry.id}
                    href={`/event/${seg.entry.id}`}
                    className={classes.join(" ")}
                    title={`${seg.entry.org} — ${seg.entry.title}`}
                    style={{
                      gridColumn: `${seg.column + 1} / span ${seg.span}`,
                      gridRow: seg.lane + 1,
                      "--topic": topicVar(topic),
                    } as React.CSSProperties}
                  >
                    <span className="bar-org">{seg.entry.org}</span>
                    <span className="bar-title">{seg.entry.title}</span>
                  </Link>
                );
              })}

              {overflow > 0 && (
                <Link
                  href={withParam(params, "day", week[0])}
                  className="bar-more"
                  style={{ gridRow: MAX_LANES + 1 }}
                  scroll={false}
                >
                  +{overflow} more this week
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
