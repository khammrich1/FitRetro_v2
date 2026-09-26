import { describe, expect, it } from "vitest";
import type { Goal } from "@/db/schema";
import { presentGoal, sortGoals } from "./present";

const TODAY = "2026-09-26";

function goal(overrides: Partial<Goal>): Goal {
  return {
    id: crypto.randomUUID(),
    userId: "u",
    title: "Goal",
    notes: null,
    status: "active",
    startedOn: null,
    targetDate: null,
    achievedOn: null,
    achievedPrecision: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("presentGoal", () => {
  it("counts days on an active goal", () => {
    expect(presentGoal(goal({ startedOn: "2026-01-01" }), TODAY)).toEqual({
      headline: "Day 269 · since Jan 1, 2026",
      detail: null,
    });
    expect(presentGoal(goal({ startedOn: TODAY }), TODAY).headline).toBe(
      "Day 1 · since Sep 26, 2026",
    );
  });

  it("shows time to a target, and flags a missed one gently", () => {
    expect(presentGoal(goal({ startedOn: "2026-01-01", targetDate: "2026-12-31" }), TODAY)).toEqual(
      { headline: "Day 269 · since Jan 1, 2026", detail: "Target Dec 31, 2026 · 96 days to go" },
    );
    expect(presentGoal(goal({ startedOn: "2026-01-01", targetDate: TODAY }), TODAY).detail).toBe(
      "Target is today",
    );
    const missed = presentGoal(goal({ startedOn: "2026-01-01", targetDate: "2026-06-30" }), TODAY);
    expect(missed.overdue).toBe(true);
    expect(missed.detail).toMatch(/^Target was Jun 30, 2026/);
  });

  it("describes the muscle up milestone without inventing a day", () => {
    const muscleUp = goal({
      status: "achieved",
      startedOn: "2026-01-01",
      achievedOn: "2026-03-01",
      achievedPrecision: "month",
    });
    expect(presentGoal(muscleUp, TODAY)).toEqual({
      headline: "Achieved sometime in March 2026",
      detail: "Goal since Jan 1, 2026 · took about 2 months",
    });
  });

  it("describes exact-day and year-only milestones", () => {
    expect(
      presentGoal(
        goal({
          status: "achieved",
          startedOn: "2026-01-01",
          achievedOn: "2026-02-15",
          achievedPrecision: "day",
        }),
        TODAY,
      ),
    ).toEqual({
      headline: "Achieved Feb 15, 2026",
      detail: "Goal since Jan 1, 2026 · took 45 days",
    });
    expect(
      presentGoal(
        goal({ status: "achieved", achievedOn: "2019-01-01", achievedPrecision: "year" }),
        TODAY,
      ),
    ).toEqual({ headline: "Achieved sometime in 2019", detail: null });
  });
});

describe("sortGoals", () => {
  it("orders active goals by nearest target, milestones newest first", () => {
    const later = goal({ title: "later", targetDate: "2026-12-31", startedOn: "2026-01-01" });
    const sooner = goal({ title: "sooner", targetDate: "2026-10-31", startedOn: "2026-05-01" });
    const open = goal({ title: "open", startedOn: "2025-01-01" });
    const old = goal({
      title: "old",
      status: "achieved",
      achievedOn: "2019-01-01",
      achievedPrecision: "year",
    });
    const recent = goal({
      title: "recent",
      status: "achieved",
      achievedOn: "2026-03-01",
      achievedPrecision: "month",
    });

    const { active, milestones } = sortGoals([open, old, later, recent, sooner]);
    expect(active.map((g) => g.title)).toEqual(["sooner", "later", "open"]);
    expect(milestones.map((g) => g.title)).toEqual(["recent", "old"]);
  });
});
