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
