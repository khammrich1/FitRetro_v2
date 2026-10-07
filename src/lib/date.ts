export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real calendar day in "YYYY-MM-DD" form — "2026-02-30" is not one. (JavaScript's
 * Date would quietly turn it into March 2; this never does.) */
export function isValidIsoDay(value: string): boolean {
  if (!ISO_DAY.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** The Date that toIsoDate() maps back to `iso`: local midnight of that calendar day. The one
 * way day-scoped queries should turn a "YYYY-MM-DD" into the Date they take. */
export function dayFromIso(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

/** Parses a "YYYY-MM-DD" search-param/form date. Anything that isn't a real calendar day falls
 * back to `todayIso` (the member's today, from todayIsoIn), or the server's today if none is
 * given. */
export function parseDayParam(param: string | null | undefined, todayIso?: string): Date {
  if (param && isValidIsoDay(param)) return dayFromIso(param);
  return todayIso ? dayFromIso(todayIso) : new Date();
}

/** True if `timeZone` is an IANA zone this runtime can format in (e.g. "America/Los_Angeles"). */
export function isValidTimeZone(timeZone: string): boolean {
  if (!/^[A-Za-z0-9_+\-/]{1,64}$/.test(timeZone)) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

/** The calendar day it currently is in `timeZone`, as "YYYY-MM-DD". Null/invalid zone → the
 * server's own day. This is what "today" means for a member: their Today page, their daily AI
 * limit reset and their reminders all key off it, not the server's clock. */
export function todayIsoIn(timeZone: string | null | undefined, now: Date = new Date()): string {
  if (!timeZone || !isValidTimeZone(timeZone)) return toIsoDate(now);
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** The moment when the wall clock in `timeZone` reads `dayIso` at `time` ("HH:MM"). Used for
 * "I took it yesterday at 8:15" — 8:15 in the member's zone, not the server's. Null/invalid zone
 * → server-local. Handles DST by re-checking the offset at the first guess. */
export function zonedTimeToUtc(
  dayIso: string,
  time: string,
  timeZone: string | null | undefined,
): Date {
  if (!timeZone || !isValidTimeZone(timeZone)) return new Date(`${dayIso}T${time}:00`);
  const [year, month, day] = dayIso.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const asUtc = Date.UTC(year, month - 1, day, hours, minutes);
  const offsetAt = (instant: number) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(new Date(instant));
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    const wall = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
    return wall - instant;
  };
  let guess = asUtc - offsetAt(asUtc);
  guess = asUtc - offsetAt(guess);
  return new Date(guess);
}

export type MonthParam = { year: number; month: number };

/** Parses a "YYYY-MM" search-param month, falling back to the current month for missing/invalid
 * input. `month` is 1-indexed (January = 1), matching the string format rather than Date's
 * 0-indexed getMonth(). */
export function parseMonthParam(param: string | null | undefined, todayIso?: string): MonthParam {
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [year, month] = param.split("-").map(Number);
    if (month >= 1 && month <= 12 && year >= 2000 && year <= 2100) return { year, month };
  }
  const now = todayIso ? dayFromIso(todayIso) : new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function toMonthIso({ year, month }: MonthParam): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** The (year, month) before/after `current`, wrapping across year boundaries. */
export function shiftMonth(current: MonthParam, delta: 1 | -1): MonthParam {
  const zeroIndexed = current.month - 1 + delta;
  const year = current.year + Math.floor(zeroIndexed / 12);
  const month = ((zeroIndexed % 12) + 12) % 12;
  return { year, month: month + 1 };
}

/** Display label for a stored "YYYY-MM-DD" day, e.g. "Sep 21, 2026" or, with weekday,
 * "Sun, Sep 21, 2026". Formatted in UTC so the label is the stored calendar date no matter the
 * server's or browser's time zone. */
export function formatIsoDay(
  iso: string,
  options: { weekday?: boolean; long?: boolean } = {},
): string {
  const date = new Date(`${iso}T12:00:00Z`);
  if (options.long) {
    // Page headings: "Tuesday, October 7" — the year is implied by the day navigation beside it.
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });
  }
  return date.toLocaleDateString("en-US", {
    ...(options.weekday ? { weekday: "short" as const } : {}),
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
