"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifySession } from "@/features/auth";
import {
  createPeptideTemplate,
  updatePeptideTemplate,
  deletePeptideTemplate,
  logPeptideDose,
  deletePeptideLog,
} from "@/features/peptides";
import { peptideDoseUnitEnum, peptideFrequencyEnum } from "@/db/schema";
import { parseDayParam } from "@/lib/date";

function revalidatePeptidePaths() {
  revalidatePath("/today");
  revalidatePath("/settings/peptides");
}

const peptideTemplateSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  doseAmount: z.coerce.number().positive("Dose must be greater than 0."),
  doseUnit: z.enum(peptideDoseUnitEnum.enumValues),
  frequency: z.enum(peptideFrequencyEnum.enumValues),
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
  });
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  await createPeptideTemplate(userId, validatedFields.data);
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
  });
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  await updatePeptideTemplate(id, userId, validatedFields.data);
  revalidatePeptidePaths();
}

export async function deletePeptideTemplateAction(id: string): Promise<void> {
  const { userId } = await verifySession();
  await deletePeptideTemplate(id, userId);
  revalidatePeptidePaths();
}

export async function logPeptideDoseAction(templateId: string, dayIso: string): Promise<void> {
  const { userId } = await verifySession();
  await logPeptideDose(templateId, userId, parseDayParam(dayIso));
  revalidatePeptidePaths();
}

export async function deletePeptideLogAction(id: string): Promise<void> {
  const { userId } = await verifySession();
  await deletePeptideLog(id, userId);
  revalidatePeptidePaths();
}
