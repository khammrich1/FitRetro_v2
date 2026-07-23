import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const TEXT_ESTIMATION_MODEL = "claude-haiku-4-5";
// Estimating portions/foods from a photo is a harder task than parsing an exact
// text description, so it gets a stronger model than the plain-text path.
const IMAGE_ESTIMATION_MODEL = "claude-sonnet-5";

export const SUPPORTED_IMAGE_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type SupportedImageMediaType = (typeof SUPPORTED_IMAGE_MEDIA_TYPES)[number];

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
    model: TEXT_ESTIMATION_MODEL,
    max_tokens: 1024,
    // Basic web search — the dynamic-filtering 20260209 variant isn't available on Haiku 4.5.
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 2 }],
    output_config: { format: zodOutputFormat(macroEstimateSchema) },
    messages: [
      {
        role: "user",
        content: `Estimate the nutrition facts for this meal description. Break it down into
individual food items with your best-guess quantity for each, then give calorie and macro
totals (protein, carbs, fat in grams) summed across all items. Use standard nutrition data for
common foods and typical preparation methods when the description doesn't specify (e.g. assume
cooked weight unless raw is stated, and a light/moderate amount of any added fat like oil or
dressing).

This description may come from voice-to-text and can contain transcription errors, especially in
unit words (e.g. "oz" misheard as "on", "ounce" dropped, "grams" garbled). If a quantity's unit
looks garbled or nonstandard, infer the most likely intended unit from context — oz, cups, grams,
and pounds are the common units for food serving sizes — rather than treating the quantity as
unspecified or ignoring it. A small wording glitch like this should not change the answer;
prioritize the numeric quantities stated over the exact spelling of their units.

If the description names a specific branded or packaged product (e.g. a named protein shake,
protein bar, or snack brand), search the web for that product's actual nutrition label instead of
estimating from general knowledge — brand-specific values can differ substantially from a typical
item of that type. The same caution applies to specific cuts of meat or less-common whole
foods — e.g. chicken tenderloin, breast, and thigh have meaningfully different fat/calorie
profiles per pound even though they're all "chicken" — if you're not confident of precise
reference values (like USDA FoodData Central) for the specific cut/type named, search to confirm
rather than guessing from a generic average.

Some descriptions list the ingredients used to cook a whole batch of a shared dish (with
label/quantity info for each ingredient, e.g. "20oz jar of sauce, 40 cal/serving, 9.5 servings" or
"1 lb of ground beef") rather than a single-serving meal. When that pattern appears, never report
the whole batch as the meal eaten. Instead: (1) find/total the nutrition for every ingredient in
the full batch, using given label info directly and searching the web for branded or specific
items per the guidance above; (2) estimate the total cooked weight of the batch, accounting for
water absorbed by dry ingredients like pasta/rice and moisture lost from cooking meat; (3) scale
the batch totals down to a single serving and report items/totals for that serving only — not the
full batch. If the description states how much was actually eaten (e.g. "I had a 10oz bowl", "I
ate about half of it"), scale to that exact amount; if it doesn't say, assume a typical single-adult
serving size for that kind of dish (roughly 12-16oz for a hearty pasta-and-meat-sauce style meal,
adjusting for the dish type) rather than defaulting to the whole batch. Meal description:
"${description}"`,
      },
    ],
  });

  if (!response.parsed_output) {
    throw new Error("Failed to parse macro estimate from the model response.");
  }

  return response.parsed_output;
}

export async function estimateMacrosFromImage(
  imageBase64: string,
  mediaType: SupportedImageMediaType,
  note?: string,
): Promise<MacroEstimate> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured. Set it in .env to enable macro estimation, or enter macros manually below.",
    );
  }

  const client = new Anthropic();

  const response = await client.messages.parse({
    model: IMAGE_ESTIMATION_MODEL,
    max_tokens: 1024,
    // Sonnet 5 supports the dynamic-filtering web search variant.
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 2 }],
    output_config: { format: zodOutputFormat(macroEstimateSchema) },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageBase64 },
          },
          {
            type: "text",
            text: `Identify the food(s) in this photo and estimate the nutrition facts. Break it
down into individual food items with your best-guess quantity for each based on visual portion
size, then give calorie and macro totals (protein, carbs, fat in grams) summed across all items.
Use standard nutrition data for common foods and typical preparation methods when the photo
doesn't make something clear (e.g. assume cooked weight, and a light/moderate amount of any
visible added fat like oil or dressing).

If the photo shows a specific branded or packaged product (visible label, logo, or packaging),
search the web for that product's actual nutrition label instead of estimating from general
knowledge — brand-specific values can differ substantially from a typical item of that type. The
same caution applies to specific cuts of meat or less-common whole foods — e.g. chicken
tenderloin, breast, and thigh have meaningfully different fat/calorie profiles per pound even
though they're all "chicken" — if you're not confident of precise reference values (like USDA
FoodData Central) for the specific cut/type shown or named on any visible packaging/label, search
to confirm rather than guessing from a generic average.

If the user's context below describes the ingredients used to cook a whole batch of a shared dish
(with label/quantity info for each ingredient) and separately states how much of the finished dish
this photo's portion represents, don't report the whole batch as the meal. Instead: (1) find/total
the nutrition for every ingredient in the full batch; (2) estimate the total cooked weight of the
batch, accounting for water absorbed by dry ingredients like pasta/rice and moisture lost from
cooking meat; (3) scale the batch totals down proportionally to the portion shown/described, and
report items/totals for that eaten portion only — not the full batch.${
              note
                ? ` Additional context from the user (may be voice-to-text and contain minor
transcription errors, especially in unit words like "oz" — infer the most likely intended unit
from context rather than treating a garbled quantity as unspecified): "${note}"`
                : ""
            }`,
          },
        ],
      },
    ],
  });

  if (!response.parsed_output) {
    throw new Error("Failed to parse macro estimate from the model response.");
  }

  return response.parsed_output;
}
