import Link from "next/link";
import { notFound } from "next/navigation";
import { EntryRow } from "@/components/EntryRow";
import { Masthead } from "@/components/Masthead";
import { RelativeDay } from "@/components/RelativeDay";
import { TOPIC_LABEL, primaryTopic, topicVar } from "@/components/topic";
import { entryEnd, formatRange, todayISO } from "@/lib/calendar";
import { loadEntries, loadManifest } from "@/lib/data";
import { selectById, selectInRange } from "@/lib/select";

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** One page per entry on file; the static export has no server to resolve the rest. */
export function generateStaticParams() {
  return loadEntries().map((entry) => ({ id: entry.id }));
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entries = loadEntries();
  const entry = selectById(entries, decodeURIComponent(id));
  if (!entry) notFound();

  const builtOn = todayISO();
  const lastRun = loadManifest()?.lastRun ?? null;
  const sameDay = selectInRange(entries, entry.date, entryEnd(entry)).filter((e) => e.id !== entry.id).slice(0, 4);

  return (
    <div className="shell">
      <Masthead lastRun={lastRun} builtOn={builtOn} />

      <article className="detail" style={{ "--topic": topicVar(primaryTopic(entry)) } as React.CSSProperties}>
        <Link href={`/?month=${entry.date.slice(0, 7)}&day=${entry.date}`} className="btn">
          ← Back to {entry.date.slice(0, 7)}
        </Link>

        <p className="eyebrow" style={{ marginTop: 20, color: "var(--topic)" }}>
          {entry.org} · {entry.kind === "announcement" ? "Announced" : "Scheduled"}
        </p>
        <h1 className="detail-title">{entry.title}</h1>
        <p className="detail-summary">{entry.summary}</p>

        <dl className="facts">
          <div className="fact">
            <dt className="eyebrow">When</dt>
            <dd>
              {formatRange(entry)}{" "}
              <span className="mono" style={{ color: "var(--ink-dim)", fontSize: 12 }}>
                (<RelativeDay date={entry.date} buildToday={builtOn} />)
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

        <h2 className="eyebrow" style={{ marginTop: 28 }}>
          Sources
        </h2>
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

        {sameDay.length > 0 && (
          <>
            <h2 className="eyebrow" style={{ marginTop: 28 }}>
              Also around then
            </h2>
            <div className="panel" style={{ marginTop: 8 }}>
              {sameDay.map((other) => (
                <EntryRow key={other.id} entry={other} />
              ))}
            </div>
          </>
        )}
      </article>
    </div>
  );
}
