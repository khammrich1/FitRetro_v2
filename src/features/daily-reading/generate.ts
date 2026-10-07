import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { ReadingTopicKey } from "@/lib/reading-topics";

// Generated once per (day, topic) and shared across every subscribed user — at most 4 calls a
// day total regardless of how many users subscribe — so a stronger model for writing quality is
// negligible in cost, unlike per-user/per-request generation elsewhere in the app.
const READING_MODEL = "claude-sonnet-5";

const TOPIC_PROMPTS: Record<ReadingTopicKey, string> = {
  self_help: "personal growth and self-improvement",
  leadership: "leadership and how to lead others well",
  discipline: "self-discipline and building consistent habits",
  time_management: "time management and prioritization",
};

const readingSchema = z.object({
  title: z.string().describe("A short, specific, compelling title — not generic."),
  body: z
    .string()
    .describe(
      "The full article, 800-1200 words, plain paragraphs separated by blank lines, no headers or bullet lists.",
    ),
});

export type GeneratedReading = { title: string; body: string; readMinutes: number };

function estimateReadMinutes(body: string): number {
  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(wordCount / 200));
}

/** Generates one day's short read for a topic. Direct/practical framing, not generic
 * inspirational fluff — the point is something worth actually reading in 5-10 minutes. */
export async function generateDailyReading(topic: ReadingTopicKey): Promise<GeneratedReading> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured. Set it in .env to enable the Daily Reader.",
    );
  }

  const client = new Anthropic();

  const response = await client.messages.create({
    model: READING_MODEL,
    max_tokens: 3000,
    output_config: { format: zodOutputFormat(readingSchema) },
    messages: [
      {
        role: "user",
        content: `Write a short, practical daily reading on the topic of ${TOPIC_PROMPTS[topic]}.
Aim for about 800-1200 words (a 5-10 minute read). Direct and actionable, not fluffy or generic —
give concrete advice, a specific framework, or a real example the reader can apply today. Write in
plain paragraphs, no headers or bullet lists. Give it a short, compelling title.`,
      },
    ],
  });

  // Capture completion metadata before parsing: the SDK parse helper can throw on truncated
  // JSON before callers can inspect stop_reason. Never log article text or provider errors.
  const text = response.content.find((block) => block.type === "text");
  console.info("daily_reading_generation", {
    topic,
    messageId: response.id,
    model: response.model,
    stopReason: response.stop_reason,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    maxTokens: 3000,
    responseCharacters: text?.type === "text" ? text.text.length : 0,
  });
  let article: z.infer<typeof readingSchema>;
  try {
    article = readingSchema.parse(JSON.parse(text?.type === "text" ? text.text : ""));
  } catch {
    throw new Error(
      "Daily reading structured output could not be parsed; see generation metadata.",
    );
  }
  const { title, body } = article;
  console.info("daily_reading_content_shape", {
    topic,
    messageId: response.id,
    bodyCharacters: body.length,
    words: body.trim().split(/\s+/).filter(Boolean).length,
    endsWithSentencePunctuation: /[.!?][\s\u201d\u2019"')\]]*$/.test(body),
  });
  return { title, body, readMinutes: estimateReadMinutes(body) };
}
