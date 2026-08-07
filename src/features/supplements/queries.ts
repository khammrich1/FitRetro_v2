import { and, asc, eq, inArray, lte } from "drizzle-orm";
import { db } from "@/db/client";
import {
  supplementTemplates,
  supplementLogs,
  type SupplementTemplate,
  type SupplementLog,
  type SupplementDoseUnit,
  type SupplementFrequency,
} from "@/db/schema";

function toDateOnly(day: Date) {
  const year = day.getFullYear();
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date = String(day.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
}

function ownedSupplementTemplateIds(userId: string) {
  return db
    .select({ id: supplementTemplates.id })
    .from(supplementTemplates)
    .where(eq(supplementTemplates.userId, userId));
}

export type SupplementTemplateInput = {
  name: string;
  doseAmount: number;
  doseUnit: SupplementDoseUnit;
  frequency: SupplementFrequency;
  preferredTime: string | null;
};

export async function createSupplementTemplate(userId: string, input: SupplementTemplateInput) {
  const [template] = await db
    .insert(supplementTemplates)
    .values({ userId, ...input })
    .returning();
  return template;
}

export async function updateSupplementTemplate(
  id: string,
  userId: string,
  input: SupplementTemplateInput,
) {
  const [template] = await db
    .update(supplementTemplates)
    .set(input)
    .where(and(eq(supplementTemplates.id, id), eq(supplementTemplates.userId, userId)))
    .returning();
  return template ?? null;
}

export async function deleteSupplementTemplate(id: string, userId: string) {
  await db
    .delete(supplementTemplates)
    .where(and(eq(supplementTemplates.id, id), eq(supplementTemplates.userId, userId)));
}

export async function getSupplementTemplatesForUser(userId: string): Promise<SupplementTemplate[]> {
  return db
    .select()
    .from(supplementTemplates)
    .where(eq(supplementTemplates.userId, userId))
    .orderBy(asc(supplementTemplates.createdAt));
}

/** Logs a dose of a supplement for the given day. Returns null if the template isn't owned by
 * userId. */
export async function logSupplementDose(templateId: string, userId: string, day: Date) {
  const [template] = await db
    .select()
    .from(supplementTemplates)
    .where(and(eq(supplementTemplates.id, templateId), eq(supplementTemplates.userId, userId)));
  if (!template) return null;

  const [log] = await db
    .insert(supplementLogs)
    .values({ supplementTemplateId: templateId, loggedOn: toDateOnly(day) })
    .returning();
  return log;
}

export async function deleteSupplementLog(id: string, userId: string) {
  await db
    .delete(supplementLogs)
    .where(
      and(
        eq(supplementLogs.id, id),
        inArray(supplementLogs.supplementTemplateId, ownedSupplementTemplateIds(userId)),
      ),
    );
}

/** For each of a user's supplement templates, the most recent day (on or before `day`) it was
 * logged, as a "YYYY-MM-DD" string. Templates never logged by that point are omitted. */
export async function getMostRecentSupplementLogDates(
  userId: string,
  day: Date,
): Promise<Map<string, string>> {
  const onOrBefore = toDateOnly(day);
  const rows = await db
    .select({
      supplementTemplateId: supplementLogs.supplementTemplateId,
      loggedOn: supplementLogs.loggedOn,
    })
    .from(supplementLogs)
    .innerJoin(supplementTemplates, eq(supplementLogs.supplementTemplateId, supplementTemplates.id))
    .where(and(eq(supplementTemplates.userId, userId), lte(supplementLogs.loggedOn, onOrBefore)));

  const latest = new Map<string, string>();
  for (const row of rows) {
    const current = latest.get(row.supplementTemplateId);
    if (!current || row.loggedOn > current) latest.set(row.supplementTemplateId, row.loggedOn);
  }
  return latest;
}

export type SupplementLogWithTemplate = SupplementLog & { template: SupplementTemplate };

/** All of a user's supplement doses logged on the calendar day of `day`, with their template
 * info. */
export async function getSupplementLogsForDay(
  userId: string,
  day: Date,
): Promise<SupplementLogWithTemplate[]> {
  const loggedOn = toDateOnly(day);
  const rows = await db
    .select({ log: supplementLogs, template: supplementTemplates })
    .from(supplementLogs)
    .innerJoin(supplementTemplates, eq(supplementLogs.supplementTemplateId, supplementTemplates.id))
    .where(and(eq(supplementTemplates.userId, userId), eq(supplementLogs.loggedOn, loggedOn)));

  return rows.map((row) => ({ ...row.log, template: row.template }));
}
