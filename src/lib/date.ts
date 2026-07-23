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
