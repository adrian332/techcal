import type { Entry, Topic } from "@/lib/schema";

export const TOPIC_LABEL: Record<Topic, string> = {
  ai: "AI",
  devtools: "Dev tools",
  cloud: "Cloud",
  mobile: "Mobile",
  hardware: "Hardware",
  bigtech: "Big tech",
  security: "Security",
};

/**
 * The lane an entry is drawn in when it carries more than one topic. Specific
 * beats broad, or the narrow lanes never surface: almost every model release is
 * also `ai`, and almost every cloud deprecation is also `devtools`.
 */
const PRIORITY: Topic[] = ["security", "mobile", "hardware", "ai", "cloud", "devtools", "bigtech"];

export function primaryTopic(entry: Pick<Entry, "topics">): Topic {
  return PRIORITY.find((t) => entry.topics.includes(t)) ?? entry.topics[0];
}

export function topicVar(topic: Topic): string {
  return `var(--${topic})`;
}
