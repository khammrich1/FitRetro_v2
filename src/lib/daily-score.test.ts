import { describe, expect, it } from "vitest";
import { computeDailyScore, computeTabScores } from "./daily-score";

describe("computeDailyScore", () => {
  it("sums weighted points across everything logged", () => {
    const score = computeDailyScore({
      mealsLogged: 2,
      routineStepsCompleted: 3,
      workoutSetsLogged: 12,
      workoutsCompleted: 1,
      peptideDosesLogged: 2,
      supplementDosesLogged: 3,
      routineNotesAdded: 4,
      workoutNotesAdded: 1,
    });

    expect(score.total).toBe(2 * 5 + 3 * 5 + 12 * 2 + 1 * 25 + 2 * 5 + 3 * 5 + 4 * 5 + 1 * 5);
    expect(score.breakdown).toEqual([
      { label: "Meals logged", count: 2, points: 10, tab: "nutrition" },
      { label: "Routine steps", count: 3, points: 15, tab: "routine" },
      { label: "Workout sets", count: 12, points: 24, tab: "move" },
      { label: "Workouts completed", count: 1, points: 25, tab: "move" },
      { label: "Peptide doses", count: 2, points: 10, tab: "routine" },
      { label: "Supplement doses", count: 3, points: 15, tab: "routine" },
      { label: "Routine notes", count: 4, points: 20, tab: "routine" },
      { label: "Workout notes", count: 1, points: 5, tab: "move" },
    ]);
  });

  it("returns zero total for a day with nothing logged yet", () => {
    const score = computeDailyScore({
      mealsLogged: 0,
      routineStepsCompleted: 0,
      workoutSetsLogged: 0,
      workoutsCompleted: 0,
      peptideDosesLogged: 0,
      supplementDosesLogged: 0,
      routineNotesAdded: 0,
      workoutNotesAdded: 0,
    });

    expect(score.total).toBe(0);
    expect(score.byTab).toEqual({ nutrition: 0, move: 0, routine: 0 });
  });

  it("groups points by tab, matching the /today tabs", () => {
    const score = computeDailyScore({
      mealsLogged: 2, // nutrition: 10
      routineStepsCompleted: 3, // routine: 15
      workoutSetsLogged: 12, // move: 24
      workoutsCompleted: 1, // move: 25
      peptideDosesLogged: 2, // routine: 10
      supplementDosesLogged: 3, // routine: 15
      routineNotesAdded: 4, // routine: 20
      workoutNotesAdded: 1, // move: 5
    });

    expect(score.byTab).toEqual({
      nutrition: 10,
      move: 24 + 25 + 5,
      routine: 15 + 10 + 15 + 20,
    });
    expect(score.byTab.nutrition + score.byTab.move + score.byTab.routine).toBe(score.total);
  });
});

describe("computeTabScores", () => {
  it("sums each row's points onto its tab", () => {
    const totals = computeTabScores([
      { label: "Meals logged", count: 1, points: 5, tab: "nutrition" },
      { label: "Workout sets", count: 4, points: 8, tab: "move" },
      { label: "Routine steps", count: 2, points: 10, tab: "routine" },
      { label: "Peptide doses", count: 1, points: 5, tab: "routine" },
    ]);

    expect(totals).toEqual({ nutrition: 5, move: 8, routine: 15 });
  });

  it("returns all-zero totals for an empty breakdown", () => {
    expect(computeTabScores([])).toEqual({ nutrition: 0, move: 0, routine: 0 });
  });
});
