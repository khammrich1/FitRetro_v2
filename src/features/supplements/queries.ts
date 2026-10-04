import { and, asc, desc, eq, inArray, isNotNull, isNull, lte, gte, lt } from "drizzle-orm";
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

/** "Delete" from the user's point of view. The row stays so every dose ever logged against it
 * keeps its history (and the days' activity scores); it just disappears from Today and the
 * settings list until restored. */
export async function archiveSupplementTemplate(id: string, userId: string) {
  await db
    .update(supplementTemplates)
    .set({ archivedAt: new Date() })
    .where(and(eq(supplementTemplates.id, id), eq(supplementTemplates.userId, userId)));
}

export async function restoreSupplementTemplate(id: string, userId: string) {
  await db
    .update(supplementTemplates)
    .set({ archivedAt: null })
    .where(and(eq(supplementTemplates.id, id), eq(supplementTemplates.userId, userId)));
}

/** The user's current (non-archived) supplements. */
export async function getSupplementTemplatesForUser(userId: string): Promise<SupplementTemplate[]> {
  return db
    .select()
    .from(supplementTemplates)
    .where(and(eq(supplementTemplates.userId, userId), isNull(supplementTemplates.archivedAt)))
    .orderBy(asc(supplementTemplates.createdAt));
}

export async function getArchivedSupplementTemplatesForUser(
  userId: string,
): Promise<SupplementTemplate[]> {
  return db
    .select()
    .from(supplementTemplates)
    .where(and(eq(supplementTemplates.userId, userId), isNotNull(supplementTemplates.archivedAt)))
    .orderBy(desc(supplementTemplates.archivedAt));
}

/** Logs a dose of a supplement for the given day. Returns null if the template isn't owned by
 * userId. */
export async function logSupplementDose(templateId: string, userId: string, day: Date) {
  const [template] = await db
    .select()
    .from(supplementTemplates)
    .where(and(eq(supplementTemplates.id, templateId), eq(supplementTemplates.userId, userId)));
  if (!template) return null;

  // Snapshot the template so a later edit can't rewrite what was taken.
  const [log] = await db
    .insert(supplementLogs)
    .values({
      supplementTemplateId: templateId,
      loggedOn: toDateOnly(day),
      name: template.name,
      doseAmount: template.doseAmount,
      doseUnit: template.doseUnit,
    })
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

/** Doses logged per day for every day in [startIso, endIso) — one query for a whole month.
 * Archived templates count: the dose was still taken that day. */
export async function countSupplementLogsPerDay(
  userId: string,
  startIso: string,
  endIso: string,
): Promise<Map<string, number>> {
  const rows = await db
    .select({ loggedOn: supplementLogs.loggedOn })
    .from(supplementLogs)
    .innerJoin(supplementTemplates, eq(supplementLogs.supplementTemplateId, supplementTemplates.id))
    .where(
      and(
        eq(supplementTemplates.userId, userId),
        gte(supplementLogs.loggedOn, startIso),
        lt(supplementLogs.loggedOn, endIso),
      ),
    );
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.loggedOn, (counts.get(row.loggedOn) ?? 0) + 1);
  return counts;
}
