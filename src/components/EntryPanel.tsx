import Link from "next/link";
import { entryEnd, formatRange, relativeDay } from "@/lib/calendar";
import { withParam, type SearchParams } from "@/lib/filters";
import type { Entry } from "@/lib/schema";
import { TOPIC_LABEL, primaryTopic, topicVar } from "./topic";

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

type Props = { entry: Entry; today: string; params: SearchParams; backToDay: string | null };

/**
 * The full entry, in the sidebar. Reading an event should not cost you your
 * place on the calendar — closing this puts you back exactly where you were,
 * including the day panel underneath it if one was open.
 */
export function EntryPanel({ entry, today, params, backToDay }: Props) {
  const close = withParam(params, "entry", null);

  return (
    <aside className="side" style={{ "--topic": topicVar(primaryTopic(entry)) } as React.CSSProperties}>
      <div className="panel">
        <div className="side-head">
          <div>
            <p className="eyebrow" style={{ margin: "0 0 3px", color: "var(--topic)" }}>
              {entry.org} · {entry.kind === "announcement" ? "Announced" : "Scheduled"}
            </p>
            <h2 className="side-date">{entry.title}</h2>
          </div>
          <Link href={close} className="btn" scroll={false} aria-label="Close entry">
            {backToDay ? "Back" : "Close"}
          </Link>
        </div>

        <div className="side-body">
          <p className="entry-summary" style={{ fontSize: 13.5, WebkitLineClamp: "unset" }}>
            {entry.summary}
          </p>

          <dl className="facts is-compact">
            <div className="fact">
              <dt className="eyebrow">When</dt>
              <dd>
                {formatRange(entry)}
                <span className="fact-note mono">
                  {relativeDay(entryEnd(entry) < today ? entryEnd(entry) : entry.date, today)}
                </span>
              </dd>
            </div>
            <div className="fact">
              <dt className="eyebrow">Confidence</dt>
              <dd>{entry.confidence}</dd>
            </div>
            <div className="fact">
              <dt className="eyebrow">Topics</dt>
              <dd>{entry.topics.map((t) => TOPIC_LABEL[t]).join(", ")}</dd>
            </div>
            <div className="fact">
              <dt className="eyebrow">Where</dt>
              <dd>{entry.location ?? "—"}</dd>
            </div>
            <div className="fact">
              <dt className="eyebrow">First seen</dt>
              <dd className="mono">{entry.firstSeen}</dd>
            </div>
            <div className="fact">
              <dt className="eyebrow">Last verified</dt>
              <dd className="mono">{entry.lastVerified}</dd>
            </div>
          </dl>

          <p className="eyebrow" style={{ marginTop: 16 }}>
            Sources
          </p>
          <ul className="sources">
            {entry.sources.map((source) => (
              <li key={source.url}>
                <a className="source" href={source.url} target="_blank" rel="noreferrer noopener">
                  <span>{source.title}</span>
                  <span className="host">{host(source.url)}</span>
                </a>
              </li>
            ))}
          </ul>

          <div className="side-actions">
            <Link href={close} className="btn" scroll={false}>
              {backToDay ? "← Back to the day" : "← Back to the calendar"}
            </Link>
            <Link href={`/event/${entry.id}`} className="btn">
              Full page
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
