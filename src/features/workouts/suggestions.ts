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
  previousSuggestions?: string[],
): Promise<ExerciseSuggestion[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured. Set it in .env to enable exercise suggestions.",
    );
  }

  const client = new Anthropic();

  const notesInstruction = notes?.trim()
    ? ` The user said: "${notes.trim()}" — treat this as a direct instruction, not just a
preference to weigh alongside the target: if they name a specific muscle group to focus on, favor
that over the full target list rather than splitting suggestions evenly across every target
muscle group; if they name exercises (or types of exercises) they've already done, do not suggest
those or close variants of them; if they mention equipment constraints, respect them strictly.`
    : "";

  const avoidRepeatsInstruction = previousSuggestions?.length
    ? ` Do not repeat any of these exercises already suggested in this session: ${previousSuggestions.join(", ")}. Pick different ones this time.`
    : "";

  const response = await client.messages.parse({
    model: SUGGESTIONS_MODEL,
    max_tokens: 1024,
    output_config: { format: zodOutputFormat(exerciseSuggestionsSchema) },
    messages: [
      {
        role: "user",
        content: `Suggest 4-6 effective, realistic gym exercises for a workout. Today's target
muscle groups are: ${muscleGroups.join(", ")}.${notesInstruction}${avoidRepeatsInstruction} Mix
compound and isolation movements, suggest a reasonable sets x reps scheme for each, and give a
short one-sentence reason for each pick tying it to the target muscle group(s). For each
suggestion's muscleGroup field, pick the single closest match from:
${muscleGroupEnum.enumValues.join(", ")}.`,
      },
    ],
  });

  if (!response.parsed_output) {
    throw new Error("Failed to generate exercise suggestions.");
  }

  return response.parsed_output.suggestions;
}
