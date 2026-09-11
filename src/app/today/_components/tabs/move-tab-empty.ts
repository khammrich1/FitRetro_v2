/** Pure so it's unit-testable without rendering: true only when there's nothing at all to
 * show yet — no split target, no logged or in-progress workouts, and no templates to start
 * from. That's the one case that collapses to a single empty-state line instead of three
 * separate "nothing here" messages. */
export function isMoveTabEmpty({
  hasSplitTarget,
  workoutCount,
  templateCount,
}: {
  hasSplitTarget: boolean;
  workoutCount: number;
  templateCount: number;
}): boolean {
  return !hasSplitTarget && workoutCount === 0 && templateCount === 0;
}
