import Link from "next/link";
import { EntryRow } from "@/components/EntryRow";
import { Masthead } from "@/components/Masthead";
import { loadRunLogs } from "@/lib/data";
import { relativeDay, todayISO } from "@/lib/calendar";
import { entryById } from "@/lib/query";
import type { Entry } from "@/lib/schema";

export const dynamic = "force-dynamic";

function resolve(ids: string[]): { found: Entry[]; missing: string[] } {
  const found: Entry[] = [];
  const missing: string[] = [];
  for (const id of ids) {
    const entry = entryById(id);
    if (entry) found.push(entry);
    else missing.push(id);
  }
  return { found, missing };
}

export default async function ChangesPage() {
  const runs = loadRunLogs().slice(0, 14);
  const today = todayISO();

  return (
    <div className="shell">
      <Masthead>
        <Link href="/" className="btn">
          ← Calendar
        </Link>
      </Masthead>

      <div className="detail" style={{ maxWidth: 860 }}>
        <p className="eyebrow">Run log</p>
        <h1 className="detail-title">What the routine changed</h1>
        <p className="detail-summary">
          One entry per daily research run: what it added, what it corrected, and what fell out of the window.
        </p>

        {runs.length === 0 && (
          <div className="panel">
            <p className="empty">No runs recorded yet. The first daily run will file its log here.</p>
          </div>
        )}

        {runs.map((run) => {
          const added = resolve(run.added);
          const updated = resolve(run.updated);

          return (
            <section key={run.date} style={{ marginBottom: 32 }}>
              <div className="board-head" style={{ borderBottom: "1px solid var(--rule)" }}>
                <h2 className="board-title mono">{run.date}</h2>
                <span className="eyebrow">{relativeDay(run.date, today)}</span>
                <span className="eyebrow" style={{ marginLeft: "auto" }}>
                  +{run.added.length} added · {run.updated.length} updated · −{run.pruned.length} pruned
                </span>
              </div>

              {run.notes && <p className="entry-summary" style={{ padding: "10px 0" }}>{run.notes}</p>}

              {added.found.length > 0 && (
                <>
                  <p className="eyebrow" style={{ marginTop: 14 }}>Added</p>
                  <div className="panel">{added.found.map((e) => <EntryRow key={e.id} entry={e} />)}</div>
                </>
              )}

              {updated.found.length > 0 && (
                <>
                  <p className="eyebrow" style={{ marginTop: 14 }}>Updated</p>
                  <div className="panel">{updated.found.map((e) => <EntryRow key={e.id} entry={e} />)}</div>
                </>
              )}

              {run.failedSources.length > 0 && (
                <>
                  <p className="eyebrow" style={{ marginTop: 14 }}>Sources that did not respond</p>
                  <ul className="sources">
                    {run.failedSources.map((f) => (
                      <li key={f.url} className="source">
                        <span className="mono" style={{ fontSize: 12 }}>{f.url}</span>
                        <span className="host">{f.reason}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
