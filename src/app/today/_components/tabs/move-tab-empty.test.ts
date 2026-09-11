import { describe, expect, it } from "vitest";
import { isMoveTabEmpty } from "./move-tab-empty";

describe("isMoveTabEmpty", () => {
  it("is empty only when there is no split target, no workouts, and no templates", () => {
    expect(isMoveTabEmpty({ hasSplitTarget: false, workoutCount: 0, templateCount: 0 })).toBe(true);
  });

  it("is not empty when a split target exists", () => {
    expect(isMoveTabEmpty({ hasSplitTarget: true, workoutCount: 0, templateCount: 0 })).toBe(false);
  });

  it("is not empty when there are logged or in-progress workouts", () => {
    expect(isMoveTabEmpty({ hasSplitTarget: false, workoutCount: 1, templateCount: 0 })).toBe(
      false,
    );
  });

  it("is not empty when workout templates exist", () => {
    expect(isMoveTabEmpty({ hasSplitTarget: false, workoutCount: 0, templateCount: 1 })).toBe(
      false,
    );
  });
});
