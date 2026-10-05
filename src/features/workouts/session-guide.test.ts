import { describe, expect, it } from "vitest";
import { muscleGroupEnum } from "@/db/schema";
import {
  ALL_MOVEMENTS,
  REST_DAY_DYNAMIC,
  REST_DAY_STATIC,
  SESSION_SEQUENCE,
  buildSessionGuide,
} from "./session-guide";

const ids = (list: { id: string }[]) => list.map((m) => m.id);

describe("SESSION_SEQUENCE", () => {
  it("is the owner's five steps, in order", () => {
    expect(SESSION_SEQUENCE.map((s) => s.title)).toEqual([
      "Cardio warm-up",
      "Dynamic mobility",
      "Lifting",
      "Post-lifting cardio",
      "Cooldown stretching",
    ]);
  });

  it("gives the 7-minute preference only to the warm-up, and no post-lifting duration", () => {
    expect(SESSION_SEQUENCE[0].detail).toMatch(/7 minutes/);
    expect(SESSION_SEQUENCE[3].detail).not.toMatch(/\d+\s*(min|minute)/);
  });
});

describe("content catalog", () => {
  it("covers every muscle group with both dynamic and static movements", () => {
    for (const group of muscleGroupEnum.enumValues) {
      expect(ALL_MOVEMENTS.dynamic[group].length, `${group} dynamic`).toBeGreaterThanOrEqual(3);
      expect(ALL_MOVEMENTS.static[group].length, `${group} static`).toBeGreaterThanOrEqual(3);
    }
  });

  it("has no duplicate ids within a group, and every movement has the owner-required fields", () => {
    for (const table of [ALL_MOVEMENTS.dynamic, ALL_MOVEMENTS.static]) {
      for (const list of Object.values(table)) {
        expect(new Set(ids(list)).size).toBe(list.length);
        for (const m of list) {
          expect(m.name).not.toBe("");
          expect(m.how.length).toBeGreaterThan(20);
          expect(m.dose).toMatch(/\d/);
          expect(m.targets.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("keeps dynamic movements and static stretches as separate catalogs", () => {
    const dynamicIds = new Set(
      Object.values(ALL_MOVEMENTS.dynamic)
        .flat()
        .map((m) => m.id),
    );
    const staticIds = new Set(
      Object.values(ALL_MOVEMENTS.static)
        .flat()
        .map((m) => m.id),
    );
    for (const id of dynamicIds) expect(staticIds.has(id), id).toBe(false);
    for (const m of Object.values(ALL_MOVEMENTS.static).flat()) expect(m.dose).toMatch(/^Hold/);
  });

  it("never asks for a forced or painful range", () => {
    const text = JSON.stringify(ALL_MOVEMENTS) + JSON.stringify(SESSION_SEQUENCE);
    expect(text).not.toMatch(/push through (the )?pain|force|as hard as/i);
  });
});

describe("buildSessionGuide", () => {
  it("back + biceps: shoulder mobility, upper-back rotation, lats, biceps and forearms, no repeats", () => {
    const guide = buildSessionGuide(["back", "biceps"]);
    expect(guide.kind).toBe("workout");
    if (guide.kind !== "workout") return;
    expect(guide.sequence).toBe(SESSION_SEQUENCE);
    // Arm circles are in both groups' lists; shown once.
    expect(ids(guide.dynamic).filter((id) => id === "arm-circles")).toHaveLength(1);
    expect(new Set(ids(guide.dynamic)).size).toBe(guide.dynamic.length);
    expect(new Set(ids(guide.static)).size).toBe(guide.static.length);
    const targets = [...guide.dynamic, ...guide.static].flatMap((m) => m.targets).join(" ");
    for (const area of ["shoulders", "upper back", "lats", "biceps", "forearms"]) {
      expect(targets, area).toContain(area);
    }
  });

  it("keeps each group's own order and appends the others' new movements", () => {
    const guide = buildSessionGuide(["chest", "triceps"]);
    if (guide.kind !== "workout") throw new Error("expected workout");
    expect(ids(guide.dynamic)).toEqual([
      "arm-circles",
      "band-pull-aparts",
      "wall-slides",
      "push-up-plus",
      "wrist-circles",
      "band-pushdowns",
    ]);
  });

  it("ignores duplicate groups in the split itself", () => {
    const guide = buildSessionGuide(["legs", "legs"]);
    if (guide.kind !== "workout") throw new Error("expected workout");
    expect(guide.muscleGroups).toEqual(["legs"]);
    expect(ids(guide.dynamic)).toEqual(ids(ALL_MOVEMENTS.dynamic.legs));
  });

  it("gives a neutral general guide on rest or unscheduled days, without a sequence", () => {
    for (const input of [null, undefined, []]) {
      const guide = buildSessionGuide(input);
      expect(guide.kind).toBe("rest");
      expect(guide.dynamic).toBe(REST_DAY_DYNAMIC);
      expect(guide.static).toBe(REST_DAY_STATIC);
      expect(ids(guide.dynamic)).toEqual(["arm-circles", "cat-cow", "leg-swings", "inchworms"]);
      expect(ids(guide.static)).toEqual([
        "childs-pose",
        "doorway-chest-stretch",
        "hamstring-stretch",
        "figure-four",
        "hip-flexor-stretch",
      ]);
      expect("sequence" in guide).toBe(false);
    }
  });
});
