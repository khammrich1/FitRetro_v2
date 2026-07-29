import { describe, expect, it } from "vitest";
import { computeDailyScore } from "./daily-score";

describe("computeDailyScore", () => {
  it("sums weighted points across everything logged", () => {
    const score = computeDailyScore({
      mealsLogged: 2,
      routineStepsCompleted: 3,
      workoutSetsLogged: 12,
      workoutsCompleted: 1,
      peptideDosesLogged: 2,
      notesAdded: 4,
    });

    expect(score.total).toBe(2 * 5 + 3 * 5 + 12 * 2 + 1 * 25 + 2 * 5 + 4 * 5);
    expect(score.breakdown).toEqual([
      { label: "Meals logged", count: 2, points: 10 },
      { label: "Routine steps", count: 3, points: 15 },
      { label: "Workout sets", count: 12, points: 24 },
      { label: "Workouts completed", count: 1, points: 25 },
      { label: "Peptide doses", count: 2, points: 10 },
      { label: "Notes added", count: 4, points: 20 },
    ]);
  });

  it("returns zero total for a day with nothing logged yet", () => {
    const score = computeDailyScore({
      mealsLogged: 0,
      routineStepsCompleted: 0,
      workoutSetsLogged: 0,
      workoutsCompleted: 0,
      peptideDosesLogged: 0,
      notesAdded: 0,
    });

    expect(score.total).toBe(0);
  });
});
