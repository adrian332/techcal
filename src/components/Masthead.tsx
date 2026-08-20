import Link from "next/link";
import { getMeta } from "@/lib/db";
import { db } from "@/lib/query";
import { loadManifest } from "@/lib/data";

function relativeSync(iso: string | null): string {
  if (!iso) return "never";
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function Masthead({ children }: { children?: React.ReactNode }) {
  const lastSync = getMeta(db(), "lastSync");
  const lastRun = loadManifest()?.lastRun ?? null;

  return (
    <header className="masthead">
      <div>
        <h1 className="wordmark">
          <Link href="/">
            Tech<span>Cal</span>
          </Link>
        </h1>
        <p className="masthead-note">What tech is doing, by the day.</p>
      </div>

      <div className="masthead-right">
        {children}
        <div className="stamp">
          <div>researched {lastRun ?? "—"}</div>
          <div>synced {relativeSync(lastSync)}</div>
        </div>
      </div>
    </header>
  );
}
