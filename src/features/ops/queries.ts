import { eq, gte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  users,
  nutritionEntries,
  waterIntake,
  workouts,
  dailyNotes,
  routineCompletions,
  routineItems,
  routines,
  supplementLogs,
  supplementTemplates,
  peptideLogs,
  peptideTemplates,
  pageViews,
} from "@/db/schema";

/** FitRetro has exactly one owner; "today" and "last 7 days" on /ops are measured in the
 * owner's timezone rather than UTC or each visitor's own timezone. */
export const OWNER_TIMEZONE = "America/Los_Angeles";

export function toOwnerDayIso(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: OWNER_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function daysAgoIso(days: number): string {
  return toOwnerDayIso(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
}

export type ActivitySource =
  "nutrition" | "water" | "workout" | "daily_note" | "routine" | "supplement" | "peptide";

export type ActivityRow = { userId: string; day: string; source: ActivitySource };

/** Timestamp columns (loggedAt/startedAt) are converted to a calendar day in the owner's
 * timezone; the other tables already store a plain calendar day, so no conversion is needed
 * for those. */
async function getNutritionActivity(): Promise<ActivityRow[]> {
  const rows = await db
    .select({
      userId: nutritionEntries.userId,
      day: sql<string>`to_char(${nutritionEntries.loggedAt} AT TIME ZONE 'America/Los_Angeles', 'YYYY-MM-DD')`,
    })
    .from(nutritionEntries);
  return rows.map((row) => ({ ...row, source: "nutrition" as const }));
}

async function getWaterActivity(): Promise<ActivityRow[]> {
  const rows = await db
    .select({ userId: waterIntake.userId, day: waterIntake.day })
    .from(waterIntake);
  return rows.map((row) => ({ ...row, source: "water" as const }));
}

async function getWorkoutActivity(): Promise<ActivityRow[]> {
  const rows = await db
    .select({
      userId: workouts.userId,
      day: sql<string>`to_char(${workouts.startedAt} AT TIME ZONE 'America/Los_Angeles', 'YYYY-MM-DD')`,
    })
    .from(workouts);
  return rows.map((row) => ({ ...row, source: "workout" as const }));
}

async function getDailyNoteActivity(): Promise<ActivityRow[]> {
  const rows = await db.select({ userId: dailyNotes.userId, day: dailyNotes.day }).from(dailyNotes);
  return rows.map((row) => ({ ...row, source: "daily_note" as const }));
}

/** routine_completions has no direct userId — it's reached only via routine_items -> routines. */
async function getRoutineActivity(): Promise<ActivityRow[]> {
  const rows = await db
    .select({ userId: routines.userId, day: routineCompletions.completedOn })
    .from(routineCompletions)
    .innerJoin(routineItems, eq(routineCompletions.routineItemId, routineItems.id))
    .innerJoin(routines, eq(routineItems.routineId, routines.id));
  return rows.map((row) => ({ ...row, source: "routine" as const }));
}

/** supplement_logs has no direct userId — reached via supplement_templates. */
async function getSupplementActivity(): Promise<ActivityRow[]> {
  const rows = await db
    .select({ userId: supplementTemplates.userId, day: supplementLogs.loggedOn })
    .from(supplementLogs)
    .innerJoin(
      supplementTemplates,
      eq(supplementLogs.supplementTemplateId, supplementTemplates.id),
    );
  return rows.map((row) => ({ ...row, source: "supplement" as const }));
}

/** peptide_logs has no direct userId — reached via peptide_templates. */
async function getPeptideActivity(): Promise<ActivityRow[]> {
  const rows = await db
    .select({ userId: peptideTemplates.userId, day: peptideLogs.loggedOn })
    .from(peptideLogs)
    .innerJoin(peptideTemplates, eq(peptideLogs.peptideTemplateId, peptideTemplates.id));
  return rows.map((row) => ({ ...row, source: "peptide" as const }));
}

async function getAllActivityRows(): Promise<ActivityRow[]> {
  const sources = await Promise.all([
    getNutritionActivity(),
    getWaterActivity(),
    getWorkoutActivity(),
    getDailyNoteActivity(),
    getRoutineActivity(),
    getSupplementActivity(),
    getPeptideActivity(),
  ]);
  return sources.flat();
}

export type LastActivity = { day: string; source: ActivitySource };

/** Reduces raw per-source activity rows to each user's single most-recent day and which source
 * it came from. Pure and DB-free so it can be unit tested directly against fabricated rows. */
export function computeLastActivityByUser(rows: ActivityRow[]): Map<string, LastActivity> {
  const result = new Map<string, LastActivity>();
  for (const row of rows) {
    const existing = result.get(row.userId);
    if (!existing || row.day > existing.day) {
      result.set(row.userId, { day: row.day, source: row.source });
    }
  }
  return result;
}

/** Counts users whose last activity falls on or after `sinceIsoInclusive` — pure, so "today"
 * and "last 7 days" windows can be tested without touching the database. */
export function countActiveSince(
  lastActivityByUser: Map<string, LastActivity>,
  sinceIsoInclusive: string,
): number {
  let total = 0;
  for (const { day } of lastActivityByUser.values()) {
    if (day >= sinceIsoInclusive) total++;
  }
  return total;
}

export type OwnerRosterEntry = {
  id: string;
  displayName: string;
  email: string;
  isAdmin: boolean;
  createdAt: Date;
  lastActivity: LastActivity | null;
};

export type OwnerOpsSummary = {
  roster: OwnerRosterEntry[];
  totalUsers: number;
  newLast7Days: number;
  activeLast7Days: number;
  activeToday: number;
};

/** Roster + counts for /ops. Never selects passwordHash, session data, or any other user's
 * meal/workout/peptide/supplement/note content — only which day they were last active and
 * which feature they used, derived from tables that already carry a userId (directly or one
 * join away). */
export async function getOwnerOpsSummary(): Promise<OwnerOpsSummary> {
  const [allUsers, activityRows] = await Promise.all([
    db
      .select({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
        isAdmin: users.isAdmin,
        createdAt: users.createdAt,
      })
      .from(users),
    getAllActivityRows(),
  ]);

  const lastActivityByUser = computeLastActivityByUser(activityRows);
  const today = toOwnerDayIso(new Date());
  const sevenDaysAgo = daysAgoIso(7);

  const roster: OwnerRosterEntry[] = allUsers
    .map((user) => ({ ...user, lastActivity: lastActivityByUser.get(user.id) ?? null }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return {
    roster,
    totalUsers: allUsers.length,
    newLast7Days: allUsers.filter((user) => toOwnerDayIso(user.createdAt) >= sevenDaysAgo).length,
    activeLast7Days: countActiveSince(lastActivityByUser, sevenDaysAgo),
    activeToday: countActiveSince(lastActivityByUser, today),
  };
}

export type PageViewRow = { path: string; userId: string | null };

export type PathTraffic = {
  path: string;
  hits: number;
  uniqueAuthUsers: number;
  authHits: number;
  unauthHits: number;
};

/** Pure aggregation over already-fetched page_views rows — testable without a database. Query
 * strings are never stored in the first place (src/features/ops/page-view-logger.ts only ever
 * writes a matched prefix), so there's nothing to strip here. */
export function summarizePageViewTraffic(rows: PageViewRow[]): PathTraffic[] {
  const byPath = new Map<
    string,
    { hits: number; authUsers: Set<string>; authHits: number; unauthHits: number }
  >();

  for (const row of rows) {
    const entry = byPath.get(row.path) ?? {
      hits: 0,
      authUsers: new Set<string>(),
      authHits: 0,
      unauthHits: 0,
    };
    entry.hits += 1;
    if (row.userId) {
      entry.authUsers.add(row.userId);
      entry.authHits += 1;
    } else {
      entry.unauthHits += 1;
    }
    byPath.set(row.path, entry);
  }

  return Array.from(byPath.entries())
    .map(([path, entry]) => ({
      path,
      hits: entry.hits,
      uniqueAuthUsers: entry.authUsers.size,
      authHits: entry.authHits,
      unauthHits: entry.unauthHits,
    }))
    .sort((a, b) => b.hits - a.hits);
}

export async function getPageViewTrafficLast7Days(): Promise<PathTraffic[]> {
  const sevenDaysAgo = daysAgoIso(7);
  const rows = await db
    .select({ path: pageViews.path, userId: pageViews.userId })
    .from(pageViews)
    .where(gte(pageViews.day, sevenDaysAgo));
  return summarizePageViewTraffic(rows);
}
