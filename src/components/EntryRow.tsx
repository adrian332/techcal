import Link from "next/link";
import { formatRange } from "@/lib/calendar";
import type { Entry } from "@/lib/schema";
import { primaryTopic, topicVar } from "./topic";

export function EntryRow({ entry, className = "entry" }: { entry: Entry; className?: string }) {
  return (
    <Link
      href={`/event/${entry.id}`}
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
