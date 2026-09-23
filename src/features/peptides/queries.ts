import { and, asc, eq, inArray, isNotNull, lte } from "drizzle-orm";
import { db } from "@/db/client";
import {
  peptideTemplates,
  peptideLogs,
  type PeptideTemplate,
  type PeptideLog,
  type PeptideDoseUnit,
  type PeptideFrequency,
} from "@/db/schema";

function toDateOnly(day: Date) {
  const year = day.getFullYear();
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date = String(day.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
}

function ownedPeptideTemplateIds(userId: string) {
  return db
    .select({ id: peptideTemplates.id })
    .from(peptideTemplates)
    .where(eq(peptideTemplates.userId, userId));
}

export type PeptideTemplateInput = {
  name: string;
  doseAmount: number;
  doseUnit: PeptideDoseUnit;
  frequency: PeptideFrequency;
  preferredTime: string | null;
  vialAmountMg: number | null;
  bacWaterMl: number | null;
  halfLifeHours: number | null;
};

export async function createPeptideTemplate(userId: string, input: PeptideTemplateInput) {
  const [template] = await db
    .insert(peptideTemplates)
    .values({ userId, ...input })
    .returning();
  return template;
}

export async function updatePeptideTemplate(
  id: string,
  userId: string,
  input: PeptideTemplateInput,
) {
  const [template] = await db
    .update(peptideTemplates)
    .set(input)
    .where(and(eq(peptideTemplates.id, id), eq(peptideTemplates.userId, userId)))
    .returning();
  return template ?? null;
}

export async function deletePeptideTemplate(id: string, userId: string) {
  await db
    .delete(peptideTemplates)
    .where(and(eq(peptideTemplates.id, id), eq(peptideTemplates.userId, userId)));
}

export async function getPeptideTemplatesForUser(userId: string): Promise<PeptideTemplate[]> {
  return db
    .select()
    .from(peptideTemplates)
    .where(eq(peptideTemplates.userId, userId))
    .orderBy(asc(peptideTemplates.createdAt));
}

/** Logs a dose of a peptide for the given day. Returns null if the template isn't owned by userId. */
export async function logPeptideDose(templateId: string, userId: string, day: Date) {
  const [template] = await db
    .select()
    .from(peptideTemplates)
    .where(and(eq(peptideTemplates.id, templateId), eq(peptideTemplates.userId, userId)));
  if (!template) return null;

  const [log] = await db
    .insert(peptideLogs)
    .values({ peptideTemplateId: templateId, loggedOn: toDateOnly(day) })
    .returning();
  return log;
}

export async function deletePeptideLog(id: string, userId: string) {
  await db
    .delete(peptideLogs)
    .where(
      and(
        eq(peptideLogs.id, id),
        inArray(peptideLogs.peptideTemplateId, ownedPeptideTemplateIds(userId)),
      ),
    );
}

/** For each of a user's peptide templates, the most recent day (on or before `day`) it was
 * logged, as a "YYYY-MM-DD" string. Templates never logged by that point are omitted. */
export async function getMostRecentLogDates(
  userId: string,
  day: Date,
): Promise<Map<string, string>> {
  const onOrBefore = toDateOnly(day);
  const rows = await db
    .select({
      peptideTemplateId: peptideLogs.peptideTemplateId,
      loggedOn: peptideLogs.loggedOn,
    })
    .from(peptideLogs)
    .innerJoin(peptideTemplates, eq(peptideLogs.peptideTemplateId, peptideTemplates.id))
    .where(and(eq(peptideTemplates.userId, userId), lte(peptideLogs.loggedOn, onOrBefore)));

  const latest = new Map<string, string>();
  for (const row of rows) {
    const current = latest.get(row.peptideTemplateId);
    if (!current || row.loggedOn > current) latest.set(row.peptideTemplateId, row.loggedOn);
  }
  return latest;
}

/** All logged-dose timestamps for a user's peptide templates that have a half-life set (used for
 * the "level in body" estimate — see @/features/peptides/decay). Templates without a half-life
 * are skipped since there's nothing to estimate. Not date-bounded in SQL: log volume for a single
 * user's peptides is small enough that filtering to each template's own decay window in JS (where
 * the half-life is available) is simpler than a per-row dynamic date filter in the query. */
export async function getLogTimestampsForDecay(userId: string): Promise<Map<string, Date[]>> {
  const rows = await db
    .select({
      peptideTemplateId: peptideLogs.peptideTemplateId,
      loggedAt: peptideLogs.loggedAt,
    })
    .from(peptideLogs)
    .innerJoin(peptideTemplates, eq(peptideLogs.peptideTemplateId, peptideTemplates.id))
    .where(and(eq(peptideTemplates.userId, userId), isNotNull(peptideTemplates.halfLifeHours)));

  const byTemplate = new Map<string, Date[]>();
  for (const row of rows) {
    const existing = byTemplate.get(row.peptideTemplateId);
    if (existing) existing.push(row.loggedAt);
    else byTemplate.set(row.peptideTemplateId, [row.loggedAt]);
  }
  return byTemplate;
}

export type PeptideLogWithTemplate = PeptideLog & { template: PeptideTemplate };

/** All of a user's peptide doses logged on the calendar day of `day`, with their template info. */
export async function getPeptideLogsForDay(
  userId: string,
  day: Date,
): Promise<PeptideLogWithTemplate[]> {
  const loggedOn = toDateOnly(day);
  const rows = await db
    .select({ log: peptideLogs, template: peptideTemplates })
    .from(peptideLogs)
    .innerJoin(peptideTemplates, eq(peptideLogs.peptideTemplateId, peptideTemplates.id))
    .where(and(eq(peptideTemplates.userId, userId), eq(peptideLogs.loggedOn, loggedOn)));

  return rows.map((row) => ({ ...row.log, template: row.template }));
}
