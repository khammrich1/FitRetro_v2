"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifySession, requireOwner } from "@/features/auth";
import { createFeedback, updateFeedbackStatus } from "@/features/feedback";
import { feedbackCategoryEnum, feedbackStatusEnum } from "@/db/schema";

const submitFeedbackSchema = z.object({
  category: z.enum(feedbackCategoryEnum.enumValues),
  message: z.string().trim().min(1, "Feedback can't be empty."),
});

export type SubmitFeedbackState =
  | {
      errors?: Record<string, string[]>;
    }
  | undefined;

export async function submitFeedbackAction(
  _state: SubmitFeedbackState,
  formData: FormData,
): Promise<SubmitFeedbackState> {
  const { userId } = await verifySession();

  const validatedFields = submitFeedbackSchema.safeParse({
    category: formData.get("category"),
    message: formData.get("message"),
  });
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  await createFeedback(userId, validatedFields.data.category, validatedFields.data.message);
  revalidatePath("/feedback");
}

export async function updateFeedbackStatusAction(id: string, status: string): Promise<void> {
  await requireOwner();
  const validatedStatus = feedbackStatusEnum.enumValues.find((value) => value === status);
  if (!validatedStatus) return;

  await updateFeedbackStatus(id, validatedStatus);
  revalidatePath("/feedback/review");
}
