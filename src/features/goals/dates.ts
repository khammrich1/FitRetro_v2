import type { DatePrecision } from "@/db/schema";
import { formatIsoDay } from "@/lib/date";

/** Pure "YYYY-MM-DD" helpers for goals. All arithmetic is on UTC-anchored dates, so results never
 * depend on the server's or browser's time zone. */

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_MONTH = /^\d{4}-\d{2}$/;
const ISO_YEAR = /^\d{4}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toUtc(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date));
}

function fromUtc(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** True for a real calendar day ("2026-02-30" is not). */
export function isValidIsoDay(value: string): boolean {
  return ISO_DAY.test(value) && fromUtc(toUtc(value)) === value;
}

/** The last day of the period an achievement date stands for: the day itself, the end of its
 * month, or Dec 31 of its year. */
export function periodEnd(achievedOn: string, precision: DatePrecision): string {
  const start = toUtc(achievedOn);
  if (precision === "day") return achievedOn;
  if (precision === "month") {
    return fromUtc(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)));
  }
  return `${start.getUTCFullYear()}-12-31`;
}

export type AchievedInput = {
  precision: string | null | undefined;
  day?: string | null;
  month?: string | null;
  year?: string | null;
};

export type ResolvedAchievedDate =
  { achievedOn: string; precision: DatePrecision } | { error: string };

/** Turns the "when did you do it?" fields into a stored date + precision: an exact day as-is, a
 * month ("2026-03") as its 1st, a year ("2026") as Jan 1. Rejects anything in the future — a
 * month or year counts as future only if it hasn't started yet. */
export function resolveAchievedDate(input: AchievedInput, todayIso: string): ResolvedAchievedDate {
  let achievedOn: string;
  let precision: DatePrecision;
  if (input.precision === "day") {
    const day = input.day?.trim() ?? "";
    if (!isValidIsoDay(day)) return { error: "Pick the day you did it." };
    achievedOn = day;
    precision = "day";
  } else if (input.precision === "month") {
    const month = input.month?.trim() ?? "";
    if (!ISO_MONTH.test(month) || !isValidIsoDay(`${month}-01`)) {
      return { error: "Pick the month you did it." };
    }
    achievedOn = `${month}-01`;
    precision = "month";
  } else if (input.precision === "year") {
    const year = input.year?.trim() ?? "";
    if (!ISO_YEAR.test(year)) return { error: "Enter the year you did it." };
    achievedOn = `${year}-01-01`;
    precision = "year";
  } else {
    return { error: "Choose how well you remember the date." };
  }

  if (achievedOn > todayIso) return { error: "That's in the future." };
  if (achievedOn < "1900-01-01") return { error: "That's a little too far back." };
  return { achievedOn, precision };
}

/** "Mar 14, 2026", "March 2026" or "2026", matching what the user actually knows. */
export function formatAchieved(achievedOn: string, precision: DatePrecision): string {
  const date = toUtc(achievedOn);
  if (precision === "year") return String(date.getUTCFullYear());
  if (precision === "month") {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  }
  return formatDay(achievedOn);
}

/** "Jan 1, 2026". */
export function formatDay(day: string): string {
  return formatIsoDay(day);
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / MS_PER_DAY);
}

function plural(count: number, unit: string) {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

function roughDuration(days: number): string {
  if (days < 60) return plural(days, "day");
  const months = Math.round(days / 30.44);
  if (months < 24) return `about ${plural(months, "month")}`;
  return `about ${plural(Math.round(days / 365.25), "year")}`;
}

/** How long it took from starting a goal to achieving it, only as precisely as the achievement
 * date is known: exact days for an exact date, rough months for a month, nothing for a year. */
export function describeTimeTaken(
  startedOn: string | null,
  achievedOn: string,
  precision: DatePrecision,
): string | null {
  if (!startedOn || precision === "year") return null;
  if (precision === "day") {
    const days = daysBetween(startedOn, achievedOn);
    if (days < 0) return null;
    if (days === 0) return "the same day you started";
    return roughDuration(days);
  }
  const start = toUtc(startedOn);
  const end = toUtc(achievedOn);
  const months =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth();
  if (months < 0) return null;
  if (months === 0) return "within a month";
  if (months < 24) return `about ${plural(months, "month")}`;
  return `about ${plural(Math.round(months / 12), "year")}`;
}

/** Days until a target date: positive ahead, 0 today, negative once it has passed. */
export function daysUntil(targetDate: string, todayIso: string): number {
  return daysBetween(todayIso, targetDate);
}
