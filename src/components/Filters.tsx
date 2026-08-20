import Link from "next/link";
import { toggleParam, type SearchParams } from "@/lib/filters";
import type { Filters as FilterState } from "@/lib/query";
import { CONFIDENCE, KINDS, TOPICS } from "@/lib/schema";
import { SearchBox } from "./SearchBox";
import { TOPIC_LABEL, topicVar } from "./topic";

const KIND_LABEL: Record<string, string> = { event: "Scheduled", announcement: "Announced" };

export function Filters({ params, filters }: { params: SearchParams; filters: FilterState }) {
  return (
    <div className="filters">
      {TOPICS.map((topic) => {
        const on = filters.topics?.includes(topic) ?? false;
        return (
          <Link
            key={topic}
            href={toggleParam(params, "topic", topic)}
            className="chip"
            aria-pressed={on}
            style={{ "--chip-color": topicVar(topic) } as React.CSSProperties}
            scroll={false}
          >
            <span className="dot" />
            {TOPIC_LABEL[topic]}
          </Link>
        );
      })}

      <span className="divider" aria-hidden="true" />

      {KINDS.map((kind) => (
        <Link
          key={kind}
          href={toggleParam(params, "kind", kind)}
          className="chip"
          aria-pressed={filters.kinds?.includes(kind) ?? false}
          scroll={false}
        >
          {KIND_LABEL[kind]}
        </Link>
      ))}

      <span className="divider" aria-hidden="true" />

      {CONFIDENCE.map((level) => (
        <Link
          key={level}
          href={toggleParam(params, "confidence", level)}
          className="chip"
          aria-pressed={filters.confidence?.includes(level) ?? false}
          scroll={false}
        >
          {level}
        </Link>
      ))}

      <span className="divider" aria-hidden="true" />

      <SearchBox initial={filters.search ?? ""} />
    </div>
  );
}
