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
      }),
    )
    .min(1)
    .max(5),
});

export type FoodSuggestion = z.infer<typeof foodSuggestionsSchema>["suggestions"][number];

export async function suggestFoodsForRemainingMacros(
  remaining: RemainingMacros,
): Promise<FoodSuggestion[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured. Set it in .env to enable food suggestions.",
    );
  }

  const client = new Anthropic();

  const response = await client.messages.parse({
    model: SUGGESTIONS_MODEL,
    max_tokens: 1024,
    output_config: { format: zodOutputFormat(foodSuggestionsSchema) },
    messages: [
      {
        role: "user",
        content: `Suggest 3-5 specific, realistic, easy-to-prepare foods or simple meals that would
fit within these remaining daily macro targets (do not exceed calories or any macro by more than
a small margin): ${JSON.stringify(remaining)}. If a target is already at or below zero, suggest
very light, low-calorie options instead.`,
      },
    ],
  });

  if (!response.parsed_output) {
    throw new Error("Failed to parse food suggestions from the model response.");
  }

  return response.parsed_output.suggestions;
}
