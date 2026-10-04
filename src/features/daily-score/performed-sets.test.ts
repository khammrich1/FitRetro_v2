import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { countPerformedSets } = await import("./queries");

const at = new Date("2026-10-04T10:00:00Z");
const detail = (completed: boolean, sets: (Date | null)[]) => ({
  workout: { completedAt: completed ? at : null },
  exercises: [{ sets: sets.map((loggedAt) => ({ loggedAt })) }],
});

describe("countPerformedSets", () => {
  it("awards nothing for a freshly started template — its sets are plans", () => {
    expect(countPerformedSets(detail(false, [null, null, null]))).toBe(0);
  });

  it("counts only the sets the member has edited while the workout is in progress", () => {
    expect(countPerformedSets(detail(false, [at, null, at]))).toBe(2);
  });

  it("counts every set once the workout is finished", () => {
    expect(countPerformedSets(detail(true, [null, null, at]))).toBe(3);
  });
});
