import { describe, expect, it } from "vitest";
import { summarizeMacros } from "./queries";

describe("summarizeMacros", () => {
  it("sums calories and macros across entries", () => {
    const totals = summarizeMacros([
      { calories: 400, proteinGrams: 30, carbsGrams: 40, fatGrams: 10 },
      { calories: 250, proteinGrams: 20, carbsGrams: 20, fatGrams: 8 },
    ]);

    expect(totals).toEqual({
      calories: 650,
      proteinGrams: 50,
      carbsGrams: 60,
      fatGrams: 18,
    });
  });

  it("returns zeroed totals for an empty list", () => {
    expect(summarizeMacros([])).toEqual({
      calories: 0,
      proteinGrams: 0,
      carbsGrams: 0,
      fatGrams: 0,
    });
  });
});
