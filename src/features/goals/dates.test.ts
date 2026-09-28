import { describe, expect, it } from "vitest";
import {
  daysUntil,
  describeTimeTaken,
  formatAchieved,
  isValidIsoDay,
  periodEnd,
  resolveAchievedDate,
} from "./dates";

const TODAY = "2026-09-26";

describe("resolveAchievedDate", () => {
  it("keeps an exact day as-is", () => {
    expect(resolveAchievedDate({ precision: "day", day: "2026-03-14" }, TODAY)).toEqual({
      achievedOn: "2026-03-14",
      precision: "day",
    });
  });

  it("stores a remembered month as its 1st", () => {
    expect(resolveAchievedDate({ precision: "month", month: "2026-03" }, TODAY)).toEqual({
      achievedOn: "2026-03-01",
      precision: "month",
    });
  });

  it("stores just a year as Jan 1 — for 'I don't remember when, but it was this year'", () => {
    expect(resolveAchievedDate({ precision: "year", year: "2026" }, TODAY)).toEqual({
      achievedOn: "2026-01-01",
      precision: "year",
    });
  });

  it("allows the current month and year even though they haven't ended", () => {
    expect(resolveAchievedDate({ precision: "month", month: "2026-09" }, TODAY)).toHaveProperty(
      "achievedOn",
    );
    expect(resolveAchievedDate({ precision: "day", day: TODAY }, TODAY)).toHaveProperty(
      "achievedOn",
    );
  });

  it("rejects the future", () => {
    for (const input of [
      { precision: "day", day: "2026-09-27" },
      { precision: "month", month: "2026-10" },
      { precision: "year", year: "2027" },
    ]) {
      expect(resolveAchievedDate(input, TODAY)).toEqual({ error: "That's in the future." });
    }
  });

  it("rejects missing, malformed and impossible dates", () => {
    expect(resolveAchievedDate({ precision: "day", day: "" }, TODAY)).toHaveProperty("error");
    expect(resolveAchievedDate({ precision: "day", day: "2026-02-30" }, TODAY)).toHaveProperty(
      "error",
    );
    expect(resolveAchievedDate({ precision: "month", month: "2026-13" }, TODAY)).toHaveProperty(
      "error",
    );
    expect(resolveAchievedDate({ precision: "year", year: "26" }, TODAY)).toHaveProperty("error");
    expect(resolveAchievedDate({ precision: "week", day: TODAY }, TODAY)).toHaveProperty("error");
    expect(resolveAchievedDate({ precision: null }, TODAY)).toHaveProperty("error");
  });
});

describe("periodEnd", () => {
  it("ends a day on itself, a month on its last day (leap years too), a year on Dec 31", () => {
    expect(periodEnd("2026-03-14", "day")).toBe("2026-03-14");
    expect(periodEnd("2026-02-01", "month")).toBe("2026-02-28");
    expect(periodEnd("2028-02-01", "month")).toBe("2028-02-29");
    expect(periodEnd("2026-12-01", "month")).toBe("2026-12-31");
    expect(periodEnd("2026-01-01", "year")).toBe("2026-12-31");
  });
});

describe("formatAchieved", () => {
  it("shows only what the user actually knows", () => {
    expect(formatAchieved("2026-03-14", "day")).toBe("Mar 14, 2026");
    expect(formatAchieved("2026-03-01", "month")).toBe("March 2026");
    expect(formatAchieved("2026-01-01", "year")).toBe("2026");
  });
});

describe("describeTimeTaken", () => {
  it("counts days for an exact date, rounding to months once it's long", () => {
    expect(describeTimeTaken("2026-01-01", "2026-01-01", "day")).toBe("the same day you started");
    expect(describeTimeTaken("2026-01-01", "2026-01-02", "day")).toBe("1 day");
    expect(describeTimeTaken("2026-01-01", "2026-02-15", "day")).toBe("45 days");
    expect(describeTimeTaken("2026-01-01", "2026-03-14", "day")).toBe("about 2 months");
    expect(describeTimeTaken("2024-01-01", "2026-03-14", "day")).toBe("about 2 years");
  });

  it("stays approximate for a month — the muscle-up case", () => {
    // New Year's resolution, did it "sometime in March".
    expect(describeTimeTaken("2026-01-01", "2026-03-01", "month")).toBe("about 2 months");
    expect(describeTimeTaken("2026-01-10", "2026-01-01", "month")).toBe("within a month");
    expect(describeTimeTaken("2026-01-01", "2026-02-01", "month")).toBe("about 1 month");
  });

  it("says nothing it can't know", () => {
    expect(describeTimeTaken("2026-01-01", "2026-01-01", "year")).toBeNull();
    expect(describeTimeTaken(null, "2026-03-14", "day")).toBeNull();
    expect(describeTimeTaken("2026-05-01", "2026-03-14", "day")).toBeNull();
  });
});

describe("helpers", () => {
  it("validates real calendar days", () => {
    expect(isValidIsoDay("2026-09-26")).toBe(true);
    expect(isValidIsoDay("2026-09-31")).toBe(false);
    expect(isValidIsoDay("26-9-2026")).toBe(false);
  });

  it("counts days to a target", () => {
    expect(daysUntil("2026-12-31", TODAY)).toBe(96);
    expect(daysUntil(TODAY, TODAY)).toBe(0);
    expect(daysUntil("2026-09-20", TODAY)).toBe(-6);
  });
});
