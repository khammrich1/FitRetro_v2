import { and, asc, desc, eq, inArray, isNotNull, isNull, lte, gte, lt } from "drizzle-orm";
import { db } from "@/db/client";
import {
  peptideTemplates,
  peptideLogs,
  type PeptideTemplate,
  type PeptideLog,
  type PeptideDoseUnit,
  type PeptideFrequency,
} from "@/db/schema";
import type { DoseForEstimate } from "./decay";

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

/** "Delete" from the user's point of view. The row stays so every dose ever logged against it
 * keeps its history (and the days' activity scores); it just disappears from Today and the
 * settings list until restored. */
export async function archivePeptideTemplate(id: string, userId: string) {
  await db
    .update(peptideTemplates)
    .set({ archivedAt: new Date() })
    .where(and(eq(peptideTemplates.id, id), eq(peptideTemplates.userId, userId)));
}

export async function restorePeptideTemplate(id: string, userId: string) {
  await db
    .update(peptideTemplates)
    .set({ archivedAt: null })
    .where(and(eq(peptideTemplates.id, id), eq(peptideTemplates.userId, userId)));
}

/** The user's current (non-archived) peptides. */
export async function getPeptideTemplatesForUser(userId: string): Promise<PeptideTemplate[]> {
  return db
    .select()
    .from(peptideTemplates)
    .where(and(eq(peptideTemplates.userId, userId), isNull(peptideTemplates.archivedAt)))
    .orderBy(asc(peptideTemplates.createdAt));
}

export async function getArchivedPeptideTemplatesForUser(
  userId: string,
): Promise<PeptideTemplate[]> {
  return db
    .select()
    .from(peptideTemplates)
    .where(and(eq(peptideTemplates.userId, userId), isNotNull(peptideTemplates.archivedAt)))
    .orderBy(desc(peptideTemplates.archivedAt));
}

/** Logs a dose of a peptide for the given day, snapshotting the template's name/dose/unit so a
 * later template edit can't rewrite what was taken. `administeredAt` null means the time isn't
 * known (see @/features/peptides/dose-time). Returns null if the template isn't the user's. */
export async function logPeptideDose(
  templateId: string,
  userId: string,
  day: Date,
  administeredAt: Date | null,
) {
  const [template] = await db
    .select()
    .from(peptideTemplates)
    .where(and(eq(peptideTemplates.id, templateId), eq(peptideTemplates.userId, userId)));
  if (!template) return null;

  const [log] = await db
    .insert(peptideLogs)
    .values({
      peptideTemplateId: templateId,
      loggedOn: toDateOnly(day),
      administeredAt,
      name: template.name,
      doseAmount: template.doseAmount,
      doseUnit: template.doseUnit,
    })
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

/** Every dose (its real time, or null for unknown) of each current peptide that has a half-life
 * set, for the "level in body" estimate — see @/features/peptides/decay. Not date-bounded in SQL:
 * one person's dose history is small, and the decay window depends on each template's half-life,
 * which estimateLevel applies in JS. */
export async function getDosesForDecay(userId: string): Promise<Map<string, DoseForEstimate[]>> {
  const rows = await db
    .select({
      peptideTemplateId: peptideLogs.peptideTemplateId,
      administeredAt: peptideLogs.administeredAt,
      loggedOn: peptideLogs.loggedOn,
    })
    .from(peptideLogs)
    .innerJoin(peptideTemplates, eq(peptideLogs.peptideTemplateId, peptideTemplates.id))
    .where(
      and(
        eq(peptideTemplates.userId, userId),
        isNull(peptideTemplates.archivedAt),
        isNotNull(peptideTemplates.halfLifeHours),
      ),
    );

  const byTemplate = new Map<string, DoseForEstimate[]>();
  for (const row of rows) {
    const dose = { administeredAt: row.administeredAt, loggedOn: row.loggedOn };
    const existing = byTemplate.get(row.peptideTemplateId);
    if (existing) existing.push(dose);
    else byTemplate.set(row.peptideTemplateId, [dose]);
  }
  return byTemplate;
}

export type PeptideLogWithTemplate = PeptideLog & { template: PeptideTemplate };

/** All of a user's peptide doses logged on the calendar day of `day`, with their template info.
 * Archived templates are included on purpose: the dose was still taken that day. */
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

/** Doses logged per day for every day in [startIso, endIso) — one query for a whole month.
 * Archived templates count: the dose was still taken that day. */
export async function countPeptideLogsPerDay(
  userId: string,
  startIso: string,
  endIso: string,
): Promise<Map<string, number>> {
  const rows = await db
    .select({ loggedOn: peptideLogs.loggedOn })
    .from(peptideLogs)
    .innerJoin(peptideTemplates, eq(peptideLogs.peptideTemplateId, peptideTemplates.id))
    .where(
      and(
        eq(peptideTemplates.userId, userId),
        gte(peptideLogs.loggedOn, startIso),
        lt(peptideLogs.loggedOn, endIso),
      ),
    );
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.loggedOn, (counts.get(row.loggedOn) ?? 0) + 1);
  return counts;
}
