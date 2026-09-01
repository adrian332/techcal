import { asset } from "@/lib/asset";
import { TOPICS } from "@/lib/schema";
import { TOPIC_LABEL, topicVar } from "./topic";

/**
 * The feeds are files written at build time, not a filtered endpoint — a static
 * site has no server to narrow them per request. One per topic covers what the
 * old query string was actually used for.
 */
export function SubscribeMenu() {
  return (
    <details className="subscribe">
      <summary className="btn">Subscribe</summary>
      <div className="subscribe-menu panel">
        <p className="eyebrow">Calendar feeds (.ics)</p>
        <a className="subscribe-item" href={asset("/feeds/techcal.ics")}>
          <span className="swatch" style={{ "--topic": "var(--ink-dim)" } as React.CSSProperties} />
          Everything
        </a>
        {TOPICS.map((topic) => (
          <a key={topic} className="subscribe-item" href={asset(`/feeds/${topic}.ics`)}>
            <span className="swatch" style={{ "--topic": topicVar(topic) } as React.CSSProperties} />
            {TOPIC_LABEL[topic]}
          </a>
        ))}
        <p className="subscribe-note">
          Add the link to your calendar app as a subscription and it refreshes with each daily run.
        </p>
      </div>
    </details>
  );
}
