import { TOPICS } from "@/lib/schema";
import { TOPIC_LABEL, topicVar } from "./topic";

export function Legend() {
  return (
    <div className="legend">
      {TOPICS.map((topic) => (
        <span key={topic} className="legend-item">
          <span className="swatch" style={{ "--topic": topicVar(topic) } as React.CSSProperties} />
          {TOPIC_LABEL[topic]}
        </span>
      ))}
      <span className="divider" aria-hidden="true" />
      <span className="legend-item">
        <span className="swatch" style={{ "--topic": "var(--ink-dim)" } as React.CSSProperties} />
        Confirmed
      </span>
      <span className="legend-item">
        <span className="swatch is-expected" />
        Expected
      </span>
      <span className="legend-item">
        <span className="swatch is-rumored" />
        Rumored
      </span>
    </div>
  );
}
