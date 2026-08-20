import Link from "next/link";
import { formatRange } from "@/lib/calendar";
import type { Entry } from "@/lib/schema";
import { primaryTopic, topicVar } from "./topic";

type Props = {
  entry: Entry;
  className?: string;
  /** Where the row goes. Defaults to the standalone page; the calendar passes
      a query-string href so the entry opens in the sidebar instead. */
  href?: string;
};

export function EntryRow({ entry, className = "entry", href }: Props) {
  return (
    <Link
      href={href ?? `/event/${entry.id}`}
      scroll={false}
      className={className}
      style={{ "--topic": topicVar(primaryTopic(entry)) } as React.CSSProperties}
    >
      <div className="entry-meta">
        <span className="entry-org">{entry.org}</span>
        <span className="mono" style={{ fontSize: 11, color: "var(--ink-dim)" }}>
          {formatRange(entry)}
        </span>
        {entry.kind === "announcement" && <span className="tag is-announcement">Announced</span>}
        {entry.confidence !== "confirmed" && (
          <span className={`tag${entry.confidence === "rumored" ? " is-rumored" : ""}`}>{entry.confidence}</span>
        )}
      </div>
      <h3 className="entry-title">{entry.title}</h3>
      <p className="entry-summary">{entry.summary}</p>
    </Link>
  );
}
