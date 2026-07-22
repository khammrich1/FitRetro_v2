import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { RemainingMacros } from "./queries";

const SUGGESTIONS_MODEL = "claude-haiku-4-5";

const foodSuggestionsSchema = z.object({
  suggestions: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        calories: z.number().int(),
        proteinGrams: z.number(),
        carbsGrams: z.number(),
        fatGrams: z.number(),
        reason: z
          .string()
          .describe(
            "One short sentence explaining why this fits — reference the remaining macros it targets and, if used, which pantry items it uses.",
          ),
      }),
    )
    .min(1)
    .max(5),
});

export type FoodSuggestion = z.infer<typeof foodSuggestionsSchema>["suggestions"][number];

export async function suggestFoodsForRemainingMacros(
  remaining: RemainingMacros,
  pantryItems: string[] = [],
  preference?: string,
): Promise<FoodSuggestion[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured. Set it in .env to enable food suggestions.",
    );
  }

  const client = new Anthropic();

  const pantryInstructions =
    pantryItems.length > 0
      ? `\n\nHere's what the user currently has on hand in their pantry: ${pantryItems.join(", ")}.
Prefer suggestions that use these items where it still fits the remaining macros well. It's fine
to also suggest something that needs an item or two they don't have, but call that out in the
reason.`
      : "";

  const preferenceInstructions = preference?.trim()
    ? `\n\nThe user also said: "${preference.trim()}". Most of the suggestions should fit this
craving/constraint (e.g. a cuisine, an ingredient they want to use up, a mood) while still fitting
the remaining macros. But also include one or two suggestions that ignore this request entirely,
as good options outside of what they asked for — label those clearly in the reason (e.g. "outside
what you asked for, but...").`
    : "";

  const response = await client.messages.parse({
    model: SUGGESTIONS_MODEL,
    max_tokens: 1536,
    output_config: { format: zodOutputFormat(foodSuggestionsSchema) },
    messages: [
      {
        role: "user",
        content: `Suggest 3-5 specific, realistic, easy-to-prepare foods or simple meals that would
fit within these remaining daily macro targets (do not exceed calories or any macro by more than
a small margin): ${JSON.stringify(remaining)}. A positive number means that much is still
available; a zero or negative number means the user has already met or exceeded that target for
the day. If a target is already at or below zero, suggest very light, low-calorie options that add
as little more of that macro as possible instead of pretending there's room left.

For each suggestion, give a short one-sentence reason explaining why it fits. Be precise about
which targets are already exceeded versus which still have room — never say something "stays
under" or "fits" a target that's zero or negative in the input; instead say it "adds only a little
more" or "keeps the overage small" for any target already at or below zero, and only talk about
"remaining" room for targets that are still positive.${pantryInstructions}${preferenceInstructions}`,
      },
    ],
  });

  if (!response.parsed_output) {
    throw new Error("Failed to parse food suggestions from the model response.");
  }

  return response.parsed_output.suggestions;
}
