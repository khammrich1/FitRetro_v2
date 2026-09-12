import { describe, expect, it } from "vitest";
import { pickTodaysTopic } from "./reading-topics";

describe("pickTodaysTopic", () => {
  it("returns null when nothing is subscribed", () => {
    expect(pickTodaysTopic([], "2026-09-12")).toBeNull();
  });

  it("always returns the single subscribed topic when there's only one", () => {
    expect(pickTodaysTopic(["leadership"], "2026-09-12")).toBe("leadership");
    expect(pickTodaysTopic(["leadership"], "2026-09-13")).toBe("leadership");
  });

  it("is deterministic — the same day always picks the same topic", () => {
    const topics = ["self_help", "leadership", "discipline"] as const;
    const first = pickTodaysTopic([...topics], "2026-09-12");
    const second = pickTodaysTopic([...topics], "2026-09-12");
    expect(first).toBe(second);
  });

  it("only ever returns a currently-subscribed topic, never one that's been deselected", () => {
    // Simulates: was subscribed to all 4, deselects down to 2, then checks every day in a
    // 2-week window — a deselected topic should never come up again from this point on.
    const remaining = ["leadership", "discipline"] as const;
    for (let i = 0; i < 14; i++) {
      const day = `2026-09-${String(12 + i).padStart(2, "0")}`;
      const picked = pickTodaysTopic([...remaining], day);
      expect(picked).not.toBeNull();
      expect(remaining).toContain(picked);
    }
  });

  it("cycles through all subscribed topics rather than favoring one", () => {
    const topics = ["self_help", "leadership", "discipline", "time_management"] as const;
    const picks = new Set<string>();
    for (let i = 0; i < topics.length; i++) {
      const day = `2026-09-${String(12 + i).padStart(2, "0")}`;
      picks.add(pickTodaysTopic([...topics], day)!);
    }
    expect(picks.size).toBe(topics.length);
  });
});
