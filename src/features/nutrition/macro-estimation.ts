import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const ESTIMATION_MODEL = "claude-haiku-4-5";

const macroEstimateSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string(),
        quantity: z.string(),
        calories: z.number().int(),
        proteinGrams: z.number(),
        carbsGrams: z.number(),
        fatGrams: z.number(),
      }),
    )
    .min(1),
  totalCalories: z.number().int(),
  totalProteinGrams: z.number(),
  totalCarbsGrams: z.number(),
  totalFatGrams: z.number(),
});

export type MacroEstimate = z.infer<typeof macroEstimateSchema>;

export async function estimateMacrosFromDescription(description: string): Promise<MacroEstimate> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured. Set it in .env to enable macro estimation, or enter macros manually below.",
    );
  }

  const client = new Anthropic();

  const response = await client.messages.parse({
    model: ESTIMATION_MODEL,
    max_tokens: 1024,
    output_config: { format: zodOutputFormat(macroEstimateSchema) },
    messages: [
      {
        role: "user",
        content: `Estimate the nutrition facts for this meal description. Break it down into
individual food items with your best-guess quantity for each, then give calorie and macro
totals (protein, carbs, fat in grams) summed across all items. Use standard nutrition data for
common foods and typical preparation methods when the description doesn't specify (e.g. assume
cooked weight unless raw is stated, and a light/moderate amount of any added fat like oil or
dressing). Meal description: "${description}"`,
      },
    ],
  });

  if (!response.parsed_output) {
    throw new Error("Failed to parse macro estimate from the model response.");
  }

  return response.parsed_output;
}
