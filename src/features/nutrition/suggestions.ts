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

  const response = await client.messages.parse({
    model: SUGGESTIONS_MODEL,
    max_tokens: 1536,
    output_config: { format: zodOutputFormat(foodSuggestionsSchema) },
    messages: [
      {
        role: "user",
        content: `Suggest 3-5 specific, realistic, easy-to-prepare foods or simple meals that would
fit within these remaining daily macro targets (do not exceed calories or any macro by more than
a small margin): ${JSON.stringify(remaining)}. If a target is already at or below zero, suggest
very light, low-calorie options instead. For each suggestion, give a short one-sentence reason
explaining why it fits the remaining macros (e.g. "high in protein to help hit your remaining 20g
protein target").${pantryInstructions}`,
      },
    ],
  });

  if (!response.parsed_output) {
    throw new Error("Failed to parse food suggestions from the model response.");
  }

  return response.parsed_output.suggestions;
}
