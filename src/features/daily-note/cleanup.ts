import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Cleaning up a dictated note is a simple, low-stakes text task — default to the cheaper model
// per CLAUDE.md, same tier as macro estimation from a text description.
const CLEANUP_MODEL = "claude-haiku-4-5";

export async function cleanUpDailyNote(rawText: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured. Set it in .env to enable note cleanup, or edit the note manually.",
    );
  }

  const client = new Anthropic();

  const response = await client.messages.create({
    model: CLEANUP_MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Clean up this daily journal note, which likely came from voice dictation and may
contain filler words ("um", "like", "you know"), false starts, run-on sentences, and misheard
words. Fix punctuation and break it into clear sentences/paragraphs, remove filler and stutters,
and correct obvious transcription errors — but keep every actual point the person made and their
own voice/tone. Do not summarize, shorten, add commentary, or invent anything that wasn't said.
Output only the cleaned-up note text, nothing else (no preamble, no quotes around it).

Raw note:
${rawText}`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock) throw new Error("No text in cleanup response.");
  return textBlock.text.trim();
}
