import Link from "next/link";
import { monthLabelShort } from "@/lib/calendar";
import { TOPICS, type Entry, type Topic } from "@/lib/schema";
import { primaryTopic, topicVar } from "./topic";

type Props = {
  entries: Entry[];
  months: string[];
  currentMonth: string;
  href: (month: string) => string;
};

/**
 * The horizon: twelve months of the calendar compressed into one strip, each
 * month a stacked bar of its topic mix. It answers "when is the year busy, and
 * with what" before you have opened a single month.
 */
export function Horizon({ entries, months, currentMonth, href }: Props) {
  // Derived from TOPICS rather than written out, so adding a lane needs no edit here.
  const emptyCounts = () => Object.fromEntries(TOPICS.map((t) => [t, 0])) as Record<Topic, number>;
  const byMonth = new Map<string, Record<Topic, number>>();
  for (const month of months) byMonth.set(month, emptyCounts());
  for (const entry of entries) {
    const bucket = byMonth.get(entry.date.slice(0, 7));
    if (bucket) bucket[primaryTopic(entry)] += 1;
  }

  const peak = Math.max(1, ...[...byMonth.values()].map((b) => TOPICS.reduce((n, t) => n + b[t], 0)));

  return (
    <nav className="horizon" aria-label="Twelve-month horizon">
      {months.map((month) => {
        const bucket = byMonth.get(month)!;
        const total = TOPICS.reduce((n, t) => n + bucket[t], 0);
        const isCurrent = month === currentMonth;

        return (
          <Link
            key={month}
            href={href(month)}
            className="horizon-cell"
            aria-current={isCurrent}
            title={`${monthLabelShort(month)} — ${total} ${total === 1 ? "entry" : "entries"}`}
          >
            <span className="horizon-bar">
              {total === 0 ? (
                <span className="horizon-empty" />
              ) : (
                TOPICS.filter((t) => bucket[t] > 0).map((t) => (
                  <span
                    key={t}
                    className="horizon-seg"
                    style={{ background: topicVar(t), height: `${(bucket[t] / peak) * 100}%` }}
                  />
                ))
              )}
            </span>
            <span className="horizon-label">{monthLabelShort(month)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
