import Link from "next/link";

type Props = {
  /** The day the research routine last filed something. */
  lastRun: string | null;
  /** The day this copy of the site was rendered — how stale the page itself is. */
  builtOn: string;
  children?: React.ReactNode;
};

export function Masthead({ lastRun, builtOn, children }: Props) {
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
          <div>built {builtOn}</div>
        </div>
      </div>
    </header>
  );
}
