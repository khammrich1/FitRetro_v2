export const READING_TOPICS = ["self_help", "leadership", "discipline", "time_management"] as const;
export type ReadingTopicKey = (typeof READING_TOPICS)[number];

export const READING_TOPIC_LABELS: Record<ReadingTopicKey, string> = {
  self_help: "Self-help",
  leadership: "Leadership",
  discipline: "Discipline",
  time_management: "Time management",
};

/** Parses a comma-separated subscribed-topics string, dropping unknown/duplicate values.
 * Unlike macro order there's no "default" fallback — an empty/invalid value just means no
 * subscriptions, so the Daily Reader stays hidden. */
export function parseReadingTopics(value: string | null | undefined): ReadingTopicKey[] {
  if (!value) return [];
  const seen: ReadingTopicKey[] = [];
  for (const part of value.split(",")) {
    if (
      (READING_TOPICS as readonly string[]).includes(part) &&
      !seen.includes(part as ReadingTopicKey)
    ) {
      seen.push(part as ReadingTopicKey);
    }
  }
  return seen;
}

export function readingTopicsToString(topics: ReadingTopicKey[]): string {
  return topics.join(",");
}
