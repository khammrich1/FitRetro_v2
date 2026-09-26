import { describe, expect, it } from "vitest";
import { parseGoalForm } from "./validation";

const TODAY = "2026-09-26";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("parseGoalForm", () => {
  it("creates an active goal that starts today by default", () => {
    expect(parseGoalForm(form({ title: "  Do a muscle up  " }), TODAY)).toEqual({
      values: {
        title: "Do a muscle up",
        notes: null,
        status: "active",
        startedOn: TODAY,
        targetDate: null,
        achievedOn: null,
        achievedPrecision: null,
      },
    });
  });

  it("logs the muscle up: a New Year's resolution achieved sometime in March", () => {
    const result = parseGoalForm(
      form({
        title: "Do a muscle up",
        achieved: "on",
        startedOn: "2026-01-01",
        achievedPrecision: "month",
        achievedMonth: "2026-03",
        notes: "Been doing them ever since",
      }),
      TODAY,
    );
    expect(result).toEqual({
      values: {
        title: "Do a muscle up",
        notes: "Been doing them ever since",
        status: "achieved",
        startedOn: "2026-01-01",
        targetDate: null,
        achievedOn: "2026-03-01",
        achievedPrecision: "month",
      },
    });
  });

  it("lets a milestone have no start date at all", () => {
    const result = parseGoalForm(
      form({ title: "First 5K", achieved: "on", achievedPrecision: "year", achievedYear: "2019" }),
      TODAY,
    );
    expect(result).toMatchObject({
      values: { startedOn: null, achievedOn: "2019-01-01", achievedPrecision: "year" },
    });
  });

  it("ignores stale achievement fields when the goal isn't marked achieved", () => {
    const result = parseGoalForm(
      form({ title: "Handstand", achievedPrecision: "day", achievedDay: "2026-01-01" }),
      TODAY,
    );
    expect(result).toMatchObject({ values: { status: "active", achievedOn: null } });
  });

  it("requires a title", () => {
    expect(parseGoalForm(form({ title: "   " }), TODAY)).toEqual({
      errors: { title: ["Name your goal."] },
    });
    expect(parseGoalForm(form({}), TODAY)).toHaveProperty("errors.title");
  });

  it("requires a when for an achieved milestone, and reports it with other errors", () => {
    const result = parseGoalForm(
      form({ title: "", achieved: "on", achievedPrecision: "day", achievedDay: "" }),
      TODAY,
    );
    expect(result).toEqual({
      errors: { title: ["Name your goal."], achieved: ["Pick the day you did it."] },
    });
  });

  it("rejects an achievement before the goal started, at the precision given", () => {
    const early = parseGoalForm(
      form({
        title: "Muscle up",
        achieved: "on",
        startedOn: "2026-03-15",
        achievedPrecision: "month",
        achievedMonth: "2026-02",
      }),
      TODAY,
    );
    expect(early).toEqual({ errors: { achieved: ["That's before you started this goal."] } });

    // Same month as the start is fine even though "March" is stored as March 1.
    const sameMonth = parseGoalForm(
      form({
        title: "Muscle up",
        achieved: "on",
        startedOn: "2026-03-15",
        achievedPrecision: "month",
        achievedMonth: "2026-03",
      }),
      TODAY,
    );
    expect(sameMonth).toHaveProperty("values");
  });

  it("rejects a future start and a target before the start", () => {
    expect(parseGoalForm(form({ title: "x", startedOn: "2026-10-01" }), TODAY)).toEqual({
      errors: { startedOn: ["Start date can't be in the future."] },
    });
    expect(
      parseGoalForm(form({ title: "x", startedOn: "2026-05-01", targetDate: "2026-04-01" }), TODAY),
    ).toEqual({ errors: { targetDate: ["Target date is before the start date."] } });
  });

  it("rejects invalid dates and overlong text", () => {
    expect(parseGoalForm(form({ title: "x", targetDate: "2026-02-30" }), TODAY)).toHaveProperty(
      "errors.targetDate",
    );
    expect(parseGoalForm(form({ title: "x".repeat(121) }), TODAY)).toHaveProperty("errors.title");
    expect(parseGoalForm(form({ title: "x", notes: "y".repeat(1001) }), TODAY)).toHaveProperty(
      "errors.notes",
    );
  });
});
