import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { loadEntries } from "@/lib/data";
import { openDb, replaceAll } from "@/lib/db";

const run = promisify(execFile);

export const dynamic = "force-dynamic";

/**
 * Pull whatever the cloud routine committed overnight and rebuild the local
 * database. The launchd agent does this every morning; this exists for when the
 * Mac was asleep and you want the calendar current right now.
 */
export async function POST() {
  const log: string[] = [];

  try {
    const { stdout } = await run("git", ["pull", "--ff-only"], { cwd: process.cwd(), timeout: 60_000 });
    log.push(stdout.trim());
  } catch (err) {
    // A repo with no remote yet, or an offline Mac: still worth re-ingesting
    // whatever is on disk, so say what happened and carry on.
    log.push(`pull skipped: ${(err as Error).message.split("\n")[0]}`);
  }

  try {
    const entries = loadEntries();
    const db = openDb();
    const count = replaceAll(db, entries, new Date().toISOString());
    db.close();
    log.push(`ingested ${count} entries`);
    return Response.json({ ok: true, count, log });
  } catch (err) {
    return Response.json({ ok: false, log: [...log, (err as Error).message] }, { status: 500 });
  }
}
