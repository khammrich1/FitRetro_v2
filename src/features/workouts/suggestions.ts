import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { muscleGroupEnum } from "@/db/schema";

const SUGGESTIONS_MODEL = "claude-haiku-4-5";

const exerciseSuggestionsSchema = z.object({
  suggestions: z
    .array(
      z.object({
        name: z.string(),
        muscleGroup: z.enum(muscleGroupEnum.enumValues),
        setsAndReps: z.string().describe('Suggested sets x reps, e.g. "3x10" or "4x8-12".'),
        reason: z
          .string()
          .describe("One short sentence on why this exercise fits today's target muscle group(s)."),
      }),
    )
    .min(3)
    .max(6),
});

export type ExerciseSuggestion = z.infer<typeof exerciseSuggestionsSchema>["suggestions"][number];

export async function suggestExercisesForMuscleGroups(
  muscleGroups: string[],
  notes?: string,
): Promise<ExerciseSuggestion[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured. Set it in .env to enable exercise suggestions.",
    );
  }

  const client = new Anthropic();

  const response = await client.messages.parse({
    model: SUGGESTIONS_MODEL,
    max_tokens: 1024,
    output_config: { format: zodOutputFormat(exerciseSuggestionsSchema) },
    messages: [
      {
        role: "user",
        content: `Suggest 4-6 effective, realistic gym exercises for a workout targeting these
muscle groups: ${muscleGroups.join(", ")}. Mix compound and isolation movements, suggest a
reasonable sets x reps scheme for each, and give a short one-sentence reason for each pick tying
it to the target muscle group(s). For each suggestion's muscleGroup field, pick the single closest
match from: ${muscleGroupEnum.enumValues.join(", ")}.${
          notes?.trim()
            ? ` The user also said: "${notes.trim()}" — factor this in (equipment available, an exercise they want to avoid or include, etc.).`
            : ""
        }`,
      },
    ],
  });

  if (!response.parsed_output) {
    throw new Error("Failed to generate exercise suggestions.");
  }

  return response.parsed_output.suggestions;
}
