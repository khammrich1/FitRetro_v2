"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifySession, getMemberToday } from "@/features/auth";
import {
  createPeptideTemplate,
  updatePeptideTemplate,
  archivePeptideTemplate,
  restorePeptideTemplate,
  logPeptideDose,
  deletePeptideLog,
  resolveAdministeredAt,
} from "@/features/peptides";
import { peptideDoseUnitEnum, peptideFrequencyEnum } from "@/db/schema";
import { parseDayParam, toIsoDate } from "@/lib/date";

function revalidatePeptidePaths() {
  revalidatePath("/today");
  revalidatePath("/settings/peptides");
}

const optionalPositiveNumber = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.coerce.number().positive("Must be greater than 0.").optional(),
);

const peptideTemplateSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  doseAmount: z.coerce.number().positive("Dose must be greater than 0."),
  doseUnit: z.enum(peptideDoseUnitEnum.enumValues),
  frequency: z.enum(peptideFrequencyEnum.enumValues),
  preferredTime: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Invalid time.")
      .optional(),
  ),
  vialAmountMg: optionalPositiveNumber,
  bacWaterMl: optionalPositiveNumber,
  halfLifeHours: optionalPositiveNumber,
});

export type PeptideTemplateState =
  | {
      errors?: Record<string, string[]>;
    }
  | undefined;

export async function createPeptideTemplateAction(
  _state: PeptideTemplateState,
  formData: FormData,
): Promise<PeptideTemplateState> {
  const { userId } = await verifySession();

  const validatedFields = peptideTemplateSchema.safeParse({
    name: formData.get("name"),
    doseAmount: formData.get("doseAmount"),
    doseUnit: formData.get("doseUnit"),
    frequency: formData.get("frequency"),
    preferredTime: formData.get("preferredTime"),
    vialAmountMg: formData.get("vialAmountMg"),
    bacWaterMl: formData.get("bacWaterMl"),
    halfLifeHours: formData.get("halfLifeHours"),
  });
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  await createPeptideTemplate(userId, {
    ...validatedFields.data,
    preferredTime: validatedFields.data.preferredTime ?? null,
    vialAmountMg: validatedFields.data.vialAmountMg ?? null,
    bacWaterMl: validatedFields.data.bacWaterMl ?? null,
    halfLifeHours: validatedFields.data.halfLifeHours ?? null,
  });
  revalidatePeptidePaths();
}

export async function updatePeptideTemplateAction(
  id: string,
  formData: FormData,
): Promise<PeptideTemplateState> {
  const { userId } = await verifySession();

  const validatedFields = peptideTemplateSchema.safeParse({
    name: formData.get("name"),
    doseAmount: formData.get("doseAmount"),
    doseUnit: formData.get("doseUnit"),
    frequency: formData.get("frequency"),
    preferredTime: formData.get("preferredTime"),
    vialAmountMg: formData.get("vialAmountMg"),
    bacWaterMl: formData.get("bacWaterMl"),
    halfLifeHours: formData.get("halfLifeHours"),
  });
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  await updatePeptideTemplate(id, userId, {
    ...validatedFields.data,
    preferredTime: validatedFields.data.preferredTime ?? null,
    vialAmountMg: validatedFields.data.vialAmountMg ?? null,
    bacWaterMl: validatedFields.data.bacWaterMl ?? null,
    halfLifeHours: validatedFields.data.halfLifeHours ?? null,
  });
  revalidatePeptidePaths();
}

/** Archives rather than deletes, so the dose history stays. */
export async function archivePeptideTemplateAction(id: string): Promise<void> {
  const { userId } = await verifySession();
  await archivePeptideTemplate(id, userId);
  revalidatePeptidePaths();
}

export async function restorePeptideTemplateAction(id: string): Promise<void> {
  const { userId } = await verifySession();
  await restorePeptideTemplate(id, userId);
  revalidatePeptidePaths();
}

/** `time` is "HH:MM" from a time input, or empty. Today with no time means now; a past day with
 * no time is recorded with an unknown dose time rather than a made-up one. */
export async function logPeptideDoseAction(
  templateId: string,
  dayIso: string,
  time?: string | null,
): Promise<void> {
  const { userId } = await verifySession();
  const { todayIso, timeZone } = await getMemberToday();
  const day = parseDayParam(dayIso, todayIso);
  const administeredAt = resolveAdministeredAt({
    dayIso: toIsoDate(day),
    todayIso,
    time,
    timeZone,
  });
  await logPeptideDose(templateId, userId, day, administeredAt);
  revalidatePeptidePaths();
}

export async function deletePeptideLogAction(id: string): Promise<void> {
  const { userId } = await verifySession();
  await deletePeptideLog(id, userId);
  revalidatePeptidePaths();
}
