import { describe, expect, it } from "vitest";
import { resolveAdministeredAt, toTimeInputValue } from "./dose-time";

const now = new Date("2026-10-04T15:30:00");

describe("resolveAdministeredAt", () => {
  it("uses the given time on the chosen day", () => {
    const at = resolveAdministeredAt({
      dayIso: "2026-10-03",
      todayIso: "2026-10-04",
      time: "08:15",
      now,
    });
    expect(at).toEqual(new Date("2026-10-03T08:15:00"));
  });

  it("reads the time in the member's zone when one is known", () => {
    // 08:15 in Los Angeles on Oct 3 (PDT) is 15:15 UTC.
    const at = resolveAdministeredAt({
      dayIso: "2026-10-03",
      todayIso: "2026-10-04",
      time: "08:15",
      timeZone: "America/Los_Angeles",
      now,
    });
    expect(at?.toISOString()).toBe("2026-10-03T15:15:00.000Z");
  });

  it("means 'just now' for today with no time", () => {
    expect(
      resolveAdministeredAt({ dayIso: "2026-10-04", todayIso: "2026-10-04", time: null, now }),
    ).toBe(now);
  });

  it("is unknown for a past day with no time — never silently 'now'", () => {
    expect(
      resolveAdministeredAt({ dayIso: "2026-10-03", todayIso: "2026-10-04", time: "", now }),
    ).toBeNull();
  });

  it("treats a malformed time as absent", () => {
    expect(
      resolveAdministeredAt({ dayIso: "2026-10-03", todayIso: "2026-10-04", time: "8am", now }),
    ).toBeNull();
    expect(
      resolveAdministeredAt({ dayIso: "2026-10-04", todayIso: "2026-10-04", time: "8am", now }),
    ).toBe(now);
  });
});

describe("toTimeInputValue", () => {
  it("formats HH:MM in local time", () => {
    expect(toTimeInputValue(new Date("2026-10-04T07:05:00"))).toBe("07:05");
  });
});
