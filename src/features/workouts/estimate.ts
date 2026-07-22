import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { muscleGroupEnum } from "@/db/schema";

const ESTIMATION_MODEL = "claude-haiku-4-5";

const workoutEstimateSchema = z.object({
  exercises: z
    .array(
      z.object({
        name: z.string(),
        muscleGroup: z.enum(muscleGroupEnum.enumValues),
        sets: z.array(
          z.object({
            reps: z.number().int().nullable(),
            weightLbs: z.number().nullable(),
            durationSeconds: z.number().int().nullable(),
            rpe: z.number().nullable(),
          }),
        ),
      }),
    )
    .min(1),
});

export type WorkoutEstimate = z.infer<typeof workoutEstimateSchema>;

/** Parses a spoken/typed workout description (e.g. from voice-to-text) into structured sets. */
export async function estimateWorkoutFromDescription(
  description: string,
): Promise<WorkoutEstimate> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured. Set it in .env to enable workout parsing, or enter sets manually below.",
    );
  }

  const client = new Anthropic();

  const response = await client.messages.parse({
    model: ESTIMATION_MODEL,
    max_tokens: 1024,
    output_config: { format: zodOutputFormat(workoutEstimateSchema) },
    messages: [
      {
        role: "user",
        content: `Parse this spoken or typed workout description into structured exercises and
sets. For each exercise, identify its name and its primary muscle group (one of:
${muscleGroupEnum.enumValues.join(", ")}), and break it into individual sets with reps and weight
in pounds. If the description says something like "3 sets of 10 at 135", expand that into 3
separate set entries with the same reps/weight — don't collapse them into one. If a value isn't
mentioned for a set (e.g. no weight for a bodyweight exercise, or duration instead of reps for
something like a plank), leave that field null rather than guessing a number. Workout description:
"${description}"`,
      },
    ],
  });

  if (!response.parsed_output) {
    throw new Error("Failed to parse the workout from the description.");
  }

  return response.parsed_output;
}

const templateEstimateSchema = z.object({
  exercises: z
    .array(
      z.object({
        name: z.string(),
        muscleGroup: z.enum(muscleGroupEnum.enumValues),
        targetSetsReps: z
          .string()
          .describe('Target sets x reps for this routine, e.g. "3x10" or "4x8-12".'),
      }),
    )
    .min(1),
});

export type TemplateEstimate = z.infer<typeof templateEstimateSchema>;

/** Parses a description of a standing routine (e.g. "incline bench 3x10, dips 3x12...") into a template. */
export async function estimateTemplateFromDescription(
  description: string,
): Promise<TemplateEstimate> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured. Set it in .env to enable routine parsing, or add exercises manually below.",
    );
  }

  const client = new Anthropic();

  const response = await client.messages.parse({
    model: ESTIMATION_MODEL,
    max_tokens: 1024,
    output_config: { format: zodOutputFormat(templateEstimateSchema) },
    messages: [
      {
        role: "user",
        content: `Parse this description of a standing workout routine into an ordered list of
exercises with a target sets x reps scheme — this is a reusable template, not a specific day's
logged performance, so don't invent actual weights lifted. For each exercise, identify its name,
its primary muscle group (one of: ${muscleGroupEnum.enumValues.join(", ")}), and its target sets x
reps scheme as a short string like "3x10" or "4x8-12" (default to a reasonable scheme like "3x10"
if the description doesn't specify one for a given exercise). Routine description:
"${description}"`,
      },
    ],
  });

  if (!response.parsed_output) {
    throw new Error("Failed to parse the routine from the description.");
  }

  return response.parsed_output;
}
