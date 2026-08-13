export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parses a "YYYY-MM-DD" search-param/form date, falling back to today for missing/invalid input. */
export function parseDayParam(param: string | null | undefined): Date {
  if (!param) return new Date();
  const parsed = new Date(`${param}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export type MonthParam = { year: number; month: number };

/** Parses a "YYYY-MM" search-param month, falling back to the current month for missing/invalid
 * input. `month` is 1-indexed (January = 1), matching the string format rather than Date's
 * 0-indexed getMonth(). */
export function parseMonthParam(param: string | null | undefined): MonthParam {
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [year, month] = param.split("-").map(Number);
    if (month >= 1 && month <= 12) return { year, month };
  }
  const now = new Date();
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
