import { describe, expect, it } from "vitest";
import { compareMeasurements, describeGap, pickComparison } from "./compare";
import { latestPhotoByPose } from "./check-ins";
import { lbsToKg } from "@/features/workouts/units";

describe("compareMeasurements", () => {
  it("shows before, after and a signed change in lb / in / points", () => {
    const rows = compareMeasurements(
      { weightKg: lbsToKg(190), waistCm: 36 * 2.54, bodyFatPercent: 22 },
      { weightKg: lbsToKg(182.4), waistCm: 34.5 * 2.54, bodyFatPercent: 22 },
    );
    expect(rows).toEqual([
      { label: "Weight", from: "190 lb", to: "182.4 lb", change: "−7.6 lb" },
      { label: "Waist", from: "36 in", to: "34.5 in", change: "−1.5 in" },
      { label: "Body fat", from: "22%", to: "22%", change: "no change" },
    ]);
  });

  it("shows gains with a plus sign", () => {
    const [row] = compareMeasurements(
      { weightKg: lbsToKg(150), waistCm: null, bodyFatPercent: null },
      { weightKg: lbsToKg(158), waistCm: null, bodyFatPercent: null },
    );
    expect(row.change).toBe("+8 lb");
  });

  it("only includes values measured on both days", () => {
    expect(
      compareMeasurements(
        { weightKg: 80, waistCm: null, bodyFatPercent: 20 },
        { weightKg: null, waistCm: 80, bodyFatPercent: 19 },
      ).map((r) => r.label),
    ).toEqual(["Body fat"]);
    expect(compareMeasurements(null, { weightKg: 80, waistCm: 80, bodyFatPercent: 20 })).toEqual(
      [],
    );
  });
});

describe("describeGap", () => {
  it("reads naturally at every scale", () => {
    expect(describeGap("2026-09-20", "2026-09-20")).toBe("same day");
    expect(describeGap("2026-09-20", "2026-09-21")).toBe("1 day apart");
    expect(describeGap("2026-09-06", "2026-09-27")).toBe("3 weeks apart");
    expect(describeGap("2026-01-04", "2026-09-27")).toBe("about 9 months apart");
    expect(describeGap("2024-09-27", "2026-09-27")).toBe("about 2 years apart");
  });
});

describe("pickComparison", () => {
  const days = ["2026-09-27", "2026-09-20", "2026-09-13", "2026-01-04"]; // newest first

  it("defaults to first vs latest", () => {
    expect(pickComparison(days, {})).toEqual({ from: "2026-01-04", to: "2026-09-27" });
  });

  it("uses requested days, earlier always on the left", () => {
    expect(pickComparison(days, { from: "2026-09-20", to: "2026-09-13" })).toEqual({
      from: "2026-09-13",
      to: "2026-09-20",
    });
  });

  it("ignores days that aren't check-ins, and never compares a day with itself", () => {
    expect(pickComparison(days, { from: "2020-01-01", to: "nope" })).toEqual({
      from: "2026-01-04",
      to: "2026-09-27",
    });
    expect(pickComparison(days, { from: "2026-09-27", to: "2026-09-27" })).toEqual({
      from: "2026-09-20",
      to: "2026-09-27",
    });
  });

  it("needs two check-ins", () => {
    expect(pickComparison(["2026-09-27"], {})).toBeNull();
    expect(pickComparison([], {})).toBeNull();
  });
});

describe("latestPhotoByPose", () => {
  it("picks the newest day's last take for each pose", () => {
    const latest = latestPhotoByPose([
      { id: "new-front-1", takenOn: "2026-09-27", pose: "front" as const },
      { id: "new-front-2", takenOn: "2026-09-27", pose: "front" as const },
      { id: "old-front", takenOn: "2026-09-20", pose: "front" as const },
      { id: "old-side", takenOn: "2026-09-20", pose: "side" as const },
    ]);
    expect(latest.front?.id).toBe("new-front-2");
    expect(latest.side?.id).toBe("old-side");
    expect(latest.back).toBeUndefined();
  });
});
