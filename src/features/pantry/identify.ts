import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { SupportedImageMediaType } from "@/features/nutrition";

const IDENTIFY_MODEL = "claude-haiku-4-5";

const pantryItemIdentificationSchema = z.object({
  name: z.string(),
  quantity: z.string().nullable(),
});

export type PantryItemIdentification = z.infer<typeof pantryItemIdentificationSchema>;

/** Identifies a grocery/pantry item from a photo of it — no nutrition-facts label needed. */
export async function identifyPantryItemFromImage(
  imageBase64: string,
  mediaType: SupportedImageMediaType,
): Promise<PantryItemIdentification> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured. Set it in .env to enable photo-based pantry entry.",
    );
  }

  const client = new Anthropic();

  const response = await client.messages.parse({
    model: IDENTIFY_MODEL,
    max_tokens: 256,
    output_config: { format: zodOutputFormat(pantryItemIdentificationSchema) },
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
            text: `Identify the food/grocery item in this photo. Give a short, generic name
(e.g. "chicken breast", "canned black beans", "broccoli") rather than a brand name unless the
brand is clearly relevant. If you can estimate a rough quantity from the packaging or the amount
shown (e.g. "1 lb", "2 cans", "1 bunch"), include it — otherwise return null for quantity.`,
          },
        ],
      },
    ],
  });

  if (!response.parsed_output) {
    throw new Error("Failed to identify the pantry item from the photo.");
  }

  return response.parsed_output;
}
