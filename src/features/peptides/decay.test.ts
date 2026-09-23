import { describe, expect, it } from "vitest";
import { currentLevelPercent, decayWindowHours } from "./decay";

describe("currentLevelPercent", () => {
  it("is 100% right after a single dose", () => {
    const now = new Date("2026-09-23T12:00:00Z");
    const level = currentLevelPercent([now], 5, 24, now);
    expect(level).toBeCloseTo(100);
  });

  it("halves after one half-life", () => {
    const now = new Date("2026-09-23T12:00:00Z");
    const loggedAt = new Date("2026-09-23T00:00:00Z"); // 12 hours ago
    const level = currentLevelPercent([loggedAt], 5, 12, now);
    expect(level).toBeCloseTo(50);
  });

  it("sums contributions from multiple doses", () => {
    const now = new Date("2026-09-23T12:00:00Z");
    const doseNow = new Date("2026-09-23T12:00:00Z"); // 100%
    const doseOneHalfLifeAgo = new Date("2026-09-23T00:00:00Z"); // 50%
    const level = currentLevelPercent([doseNow, doseOneHalfLifeAgo], 5, 12, now);
    expect(level).toBeCloseTo(150);
  });

  it("ignores doses in the future", () => {
    const now = new Date("2026-09-23T12:00:00Z");
    const future = new Date("2026-09-24T12:00:00Z");
    expect(currentLevelPercent([future], 5, 24, now)).toBe(0);
  });

  it("ignores doses far outside the decay window", () => {
    const now = new Date("2026-09-23T12:00:00Z");
    const longAgo = new Date(now.getTime() - decayWindowHours(1) * 60 * 60 * 1000 - 1000);
    expect(currentLevelPercent([longAgo], 5, 1, now)).toBe(0);
  });

  it("returns 0 with no doses logged", () => {
    expect(currentLevelPercent([], 5, 24, new Date())).toBe(0);
  });
});
