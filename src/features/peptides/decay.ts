/** Doses more than this many half-lives old contribute less than 0.1% of a dose and are ignored —
 * both to keep the sum meaningful and so the caller doesn't need to fetch unbounded log history. */
const MAX_HALF_LIVES = 10;

export function decayWindowHours(halfLifeHours: number): number {
  return halfLifeHours * MAX_HALF_LIVES;
}

/** Rough single-compartment elimination estimate: each logged dose decays independently as
 * amount × 0.5^(hours since dose ÷ half-life), and the current "level" is the sum of what's left
 * of each recent dose. This ignores absorption time (assumes the full dose is active
 * immediately) — a simplification, not a pharmacokinetic model, which is why the UI must caption
 * it as a rough estimate rather than a measured value.
 *
 * Returns the active amount as a percentage of one standard dose (doseAmount), which reads more
 * intuitively than a raw unit amount — "62% of a dose still active" vs. "3.1mg still active". */
export function currentLevelPercent(
  loggedAtTimestamps: Date[],
  doseAmount: number,
  halfLifeHours: number,
  asOf: Date,
): number {
  const windowHours = decayWindowHours(halfLifeHours);
  let activeAmount = 0;

  for (const loggedAt of loggedAtTimestamps) {
    const hoursSince = (asOf.getTime() - loggedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSince < 0 || hoursSince > windowHours) continue;
    activeAmount += doseAmount * Math.pow(0.5, hoursSince / halfLifeHours);
  }

  return (activeAmount / doseAmount) * 100;
}

export type DoseForEstimate = {
  administeredAt: Date | null;
  /** "YYYY-MM-DD" day the dose was logged for; used to tell whether an unknown-time dose is
   * recent enough that leaving it out matters. */
  loggedOn: string;
};

export type LevelEstimate = {
  percent: number;
  /** Doses inside the decay window whose time isn't known and so aren't in `percent`. The UI
   * should say so — a number that quietly ignores yesterday's dose is worse than no number. */
  unknownRecentDoses: number;
};

/** currentLevelPercent over real dose times only, plus a count of recent doses it had to skip. */
export function estimateLevel(
  doses: DoseForEstimate[],
  doseAmount: number,
  halfLifeHours: number,
  asOf: Date,
): LevelEstimate {
  const windowDays = Math.ceil(decayWindowHours(halfLifeHours) / 24);
  const cutoff = new Date(asOf);
  cutoff.setDate(cutoff.getDate() - windowDays);
  const cutoffIso = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;

  const known = doses.flatMap((d) => (d.administeredAt ? [d.administeredAt] : []));
  const unknownRecentDoses = doses.filter(
    (d) => d.administeredAt === null && d.loggedOn >= cutoffIso,
  ).length;
  return {
    percent: currentLevelPercent(known, doseAmount, halfLifeHours, asOf),
    unknownRecentDoses,
  };
}
