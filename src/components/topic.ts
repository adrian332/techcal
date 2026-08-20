import type { Entry, Topic } from "@/lib/schema";

export const TOPIC_LABEL: Record<Topic, string> = {
  ai: "AI",
  bigtech: "Big tech",
  devtools: "Dev tools",
  security: "Security",
};

/** The lane an entry is drawn in when it carries more than one topic. */
const PRIORITY: Topic[] = ["security", "ai", "devtools", "bigtech"];

export function primaryTopic(entry: Pick<Entry, "topics">): Topic {
  return PRIORITY.find((t) => entry.topics.includes(t)) ?? entry.topics[0];
}

export function topicVar(topic: Topic): string {
  return `var(--${topic})`;
}
