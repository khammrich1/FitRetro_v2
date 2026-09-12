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

/** Deterministically picks exactly one of `subscribedTopics` for `dayIso` — stateless, so it's
 * recomputed fresh from whatever the user is *currently* subscribed to rather than referencing
 * anything stored. That's what makes deselecting a topic safe: it's simply removed from this
 * list from that point on, so it can never come up again — no stale "day N was assigned to X"
 * record to go wrong, and no day is ever skipped. Null when there's nothing subscribed. */
export function pickTodaysTopic(
  subscribedTopics: ReadingTopicKey[],
  dayIso: string,
): ReadingTopicKey | null {
  if (subscribedTopics.length === 0) return null;
  const [year, month, day] = dayIso.split("-").map(Number);
  const daysSinceEpoch = Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
  const index =
    ((daysSinceEpoch % subscribedTopics.length) + subscribedTopics.length) %
    subscribedTopics.length;
  return subscribedTopics[index];
}
