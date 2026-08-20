import Link from "next/link";

export default function NotFound() {
  return (
    <div className="shell">
      <div className="detail">
        <p className="eyebrow">404</p>
        <h1 className="detail-title">That entry is not on the board.</h1>
        <p className="detail-summary">
          It may have fallen outside the calendar window — announcements are kept for 60 days, scheduled events for 12
          months ahead.
        </p>
        <Link href="/" className="btn">
          ← Back to the calendar
        </Link>
      </div>
    </div>
  );
}
