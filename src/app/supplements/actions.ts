"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifySession, parseMemberDay } from "@/features/auth";
import {
  createSupplementTemplate,
  updateSupplementTemplate,
  archiveSupplementTemplate,
  restoreSupplementTemplate,
  logSupplementDose,
  deleteSupplementLog,
} from "@/features/supplements";
import { supplementDoseUnitEnum, supplementFrequencyEnum } from "@/db/schema";

function revalidateSupplementPaths() {
  revalidatePath("/today");
  revalidatePath("/settings/supplements");
}

const supplementTemplateSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  doseAmount: z.coerce.number().positive("Dose must be greater than 0."),
  doseUnit: z.enum(supplementDoseUnitEnum.enumValues),
  frequency: z.enum(supplementFrequencyEnum.enumValues),
  preferredTime: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Invalid time.")
      .optional(),
  ),
});

export type SupplementTemplateState =
  | {
      errors?: Record<string, string[]>;
    }
  | undefined;

export async function createSupplementTemplateAction(
  _state: SupplementTemplateState,
  formData: FormData,
): Promise<SupplementTemplateState> {
  const { userId } = await verifySession();

  const validatedFields = supplementTemplateSchema.safeParse({
    name: formData.get("name"),
    doseAmount: formData.get("doseAmount"),
    doseUnit: formData.get("doseUnit"),
    frequency: formData.get("frequency"),
    preferredTime: formData.get("preferredTime"),
  });
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  await createSupplementTemplate(userId, {
    ...validatedFields.data,
    preferredTime: validatedFields.data.preferredTime ?? null,
  });
  revalidateSupplementPaths();
}

export async function updateSupplementTemplateAction(
  id: string,
  formData: FormData,
): Promise<SupplementTemplateState> {
  const { userId } = await verifySession();

  const validatedFields = supplementTemplateSchema.safeParse({
    name: formData.get("name"),
    doseAmount: formData.get("doseAmount"),
    doseUnit: formData.get("doseUnit"),
    frequency: formData.get("frequency"),
    preferredTime: formData.get("preferredTime"),
  });
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  await updateSupplementTemplate(id, userId, {
    ...validatedFields.data,
    preferredTime: validatedFields.data.preferredTime ?? null,
  });
  revalidateSupplementPaths();
}

/** Archives rather than deletes, so the dose history stays. */
export async function archiveSupplementTemplateAction(id: string): Promise<void> {
  const { userId } = await verifySession();
  await archiveSupplementTemplate(id, userId);
  revalidateSupplementPaths();
}

export async function restoreSupplementTemplateAction(id: string): Promise<void> {
  const { userId } = await verifySession();
  await restoreSupplementTemplate(id, userId);
  revalidateSupplementPaths();
}

export async function logSupplementDoseAction(templateId: string, dayIso: string): Promise<void> {
  const { userId } = await verifySession();
  await logSupplementDose(templateId, userId, await parseMemberDay(dayIso));
  revalidateSupplementPaths();
}

export async function deleteSupplementLogAction(id: string): Promise<void> {
  const { userId } = await verifySession();
  await deleteSupplementLog(id, userId);
  revalidateSupplementPaths();
}
