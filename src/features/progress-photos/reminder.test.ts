import { describe, expect, it } from "vitest";
import { progressPhotoReminder, weekdayOf } from "./reminder";

// 2026-09-27 is a Sunday.
const SUNDAY = "2026-09-27";
const MONDAY = "2026-09-28";

describe("weekdayOf", () => {
  it("reads the weekday of a stored day regardless of time zone", () => {
    expect(weekdayOf(SUNDAY)).toBe(0);
    expect(weekdayOf("2026-09-26")).toBe(6);
  });
});

describe("progressPhotoReminder", () => {
  it("shows on the reminder day for someone who has never taken any", () => {
    expect(progressPhotoReminder({ reminderDay: 0, todayIso: SUNDAY, lastPhotoDay: null })).toEqual(
      {
        kind: "due",
        weekday: "Sunday",
      },
    );
  });

  it("shows on the reminder day when last week's check-in is a week old", () => {
    expect(
      progressPhotoReminder({ reminderDay: 0, todayIso: SUNDAY, lastPhotoDay: "2026-09-20" }),
    ).toEqual({ kind: "due", weekday: "Sunday" });
  });

  it("stays quiet on the reminder day if they already checked in this week", () => {
    for (const lastPhotoDay of [SUNDAY, "2026-09-26", "2026-09-23"]) {
      expect(progressPhotoReminder({ reminderDay: 0, todayIso: SUNDAY, lastPhotoDay })).toBeNull();
    }
  });

  it("stays quiet on other days unless it's been a long time", () => {
    expect(
      progressPhotoReminder({ reminderDay: 0, todayIso: MONDAY, lastPhotoDay: "2026-09-20" }),
    ).toBeNull();
    expect(
      progressPhotoReminder({ reminderDay: 0, todayIso: MONDAY, lastPhotoDay: null }),
    ).toBeNull();
    expect(
      progressPhotoReminder({ reminderDay: 0, todayIso: MONDAY, lastPhotoDay: "2026-09-18" }),
    ).toEqual({ kind: "overdue", daysSince: 10 });
  });

  it("respects a different chosen day", () => {
    expect(
      progressPhotoReminder({ reminderDay: 1, todayIso: MONDAY, lastPhotoDay: "2026-09-21" }),
    ).toEqual({ kind: "due", weekday: "Monday" });
    expect(
      progressPhotoReminder({ reminderDay: 1, todayIso: SUNDAY, lastPhotoDay: null }),
    ).toBeNull();
  });

  it("never shows when the reminder is off or invalid", () => {
    for (const reminderDay of [null, undefined, 7, -1]) {
      expect(
        progressPhotoReminder({ reminderDay, todayIso: SUNDAY, lastPhotoDay: "2025-01-01" }),
      ).toBeNull();
    }
  });
});
