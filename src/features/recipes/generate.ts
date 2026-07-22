import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const RECIPE_MODEL = "claude-haiku-4-5";

const generatedRecipeSchema = z.object({
  ingredients: z.array(z.string()).min(1),
  instructions: z.array(z.string()).min(1),
});

export type GeneratedRecipe = z.infer<typeof generatedRecipeSchema>;

/** Generates a simple single-serving recipe for a named food, roughly matching given macros. */
export async function generateRecipe(
  name: string,
  description: string,
  macros: { calories: number; proteinGrams: number; carbsGrams: number; fatGrams: number },
): Promise<GeneratedRecipe> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured. Set it in .env to enable recipe generation.",
    );
  }

  const client = new Anthropic();

  const response = await client.messages.parse({
    model: RECIPE_MODEL,
    max_tokens: 1024,
    output_config: { format: zodOutputFormat(generatedRecipeSchema) },
    messages: [
      {
        role: "user",
        content: `Write a simple, realistic home-cook recipe for a single serving of "${name}"
(${description}), roughly matching these nutrition facts: ${JSON.stringify(macros)}. List
ingredients with approximate quantities (e.g. "150g ground beef", "1 tbsp olive oil"), and give
clear, numbered, step-by-step instructions using common kitchen equipment.`,
      },
    ],
  });

  if (!response.parsed_output) {
    throw new Error("Failed to generate a recipe.");
  }

  return response.parsed_output;
}
