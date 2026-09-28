import { kgToLbs } from "@/features/workouts/units";

const CM_PER_INCH = 2.54;

type Measurement = {
  weightKg: number | null;
  waistCm: number | null;
  bodyFatPercent: number | null;
} | null;

export type MeasurementChange = {
  label: string;
  from: string;
  to: string;
  /** Signed, e.g. "−4.2 lb", "+0.5 in", "no change". */
  change: string;
};

const round1 = (value: number) => Math.round(value * 10) / 10;

function signed(value: number, unit: string) {
  const rounded = round1(value);
  if (rounded === 0) return "no change";
  // A real minus sign reads better than a hyphen next to numbers.
  return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded)}${unit}`;
}

/** Side-by-side measurement changes between two check-ins, in the units the UI uses (lb, in, %).
 * Only rows measured on both days are included — a change can't be shown from one number. No
 * good/bad colouring: whether down is good depends on the person's goal. */
export function compareMeasurements(from: Measurement, to: Measurement): MeasurementChange[] {
  if (!from || !to) return [];
  const rows: MeasurementChange[] = [];
  if (from.weightKg != null && to.weightKg != null) {
    const a = kgToLbs(from.weightKg);
    const b = kgToLbs(to.weightKg);
    rows.push({
      label: "Weight",
      from: `${round1(a)} lb`,
      to: `${round1(b)} lb`,
      change: signed(b - a, " lb"),
    });
  }
  if (from.waistCm != null && to.waistCm != null) {
    const a = from.waistCm / CM_PER_INCH;
    const b = to.waistCm / CM_PER_INCH;
    rows.push({
      label: "Waist",
      from: `${round1(a)} in`,
      to: `${round1(b)} in`,
      change: signed(b - a, " in"),
    });
  }
  if (from.bodyFatPercent != null && to.bodyFatPercent != null) {
    rows.push({
      label: "Body fat",
      from: `${round1(from.bodyFatPercent)}%`,
      to: `${round1(to.bodyFatPercent)}%`,
      change: signed(to.bodyFatPercent - from.bodyFatPercent, " pts"),
    });
  }
  return rows;
}

/** "3 weeks apart", "5 days apart", "about 4 months apart". */
export function describeGap(fromDay: string, toDay: string): string {
  const toUtc = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  const days = Math.abs(Math.round((toUtc(toDay) - toUtc(fromDay)) / 86_400_000));
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
  if (days === 0) return "same day";
  if (days < 14) return `${plural(days, "day")} apart`;
  if (days < 70) return `${plural(Math.round(days / 7), "week")} apart`;
  if (days < 730) return `about ${plural(Math.round(days / 30.44), "month")} apart`;
  return `about ${plural(Math.round(days / 365.25), "year")} apart`;
}

/** Picks the two days to compare: the requested ones if they're real check-in days, otherwise
 * the first and latest check-ins (the most dramatic view). `days` is newest first. */
export function pickComparison(
  days: string[],
  requested: { from?: string; to?: string },
): { from: string; to: string } | null {
  if (days.length < 2) return null;
  const valid = (day?: string) => (day && days.includes(day) ? day : undefined);
  const from = valid(requested.from) ?? days[days.length - 1];
  let to = valid(requested.to) ?? days[0];
  if (to === from) to = days.find((day) => day !== from)!;
  // Always show earlier on the left.
  return from < to ? { from, to } : { from: to, to: from };
}
