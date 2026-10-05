import { describe, expect, it } from "vitest";
import {
  dayFromIso,
  isValidIsoDay,
  isValidTimeZone,
  parseDayParam,
  toIsoDate,
  todayIsoIn,
  zonedTimeToUtc,
} from "./date";

describe("isValidIsoDay / parseDayParam", () => {
  it("accepts real days and rejects impossible or malformed ones", () => {
    expect(isValidIsoDay("2026-02-28")).toBe(true);
    expect(isValidIsoDay("2028-02-29")).toBe(true);
    expect(isValidIsoDay("2026-02-30")).toBe(false);
    expect(isValidIsoDay("2026-13-01")).toBe(false);
    expect(isValidIsoDay("26-1-1")).toBe(false);
    expect(isValidIsoDay("2026-02-30T00:00:00")).toBe(false);
  });

  it("round-trips a valid day and never normalises an invalid one", () => {
    expect(toIsoDate(parseDayParam("2026-09-14"))).toBe("2026-09-14");
    // Used to become March 2.
    expect(toIsoDate(parseDayParam("2026-02-30", "2026-10-04"))).toBe("2026-10-04");
    expect(toIsoDate(parseDayParam(undefined, "2026-10-04"))).toBe("2026-10-04");
    expect(toIsoDate(dayFromIso("2026-01-31"))).toBe("2026-01-31");
  });
});

describe("todayIsoIn", () => {
  // 2026-10-04 03:30 UTC is still Oct 3 in Los Angeles and already Oct 4 in London.
  const now = new Date("2026-10-04T03:30:00Z");

  it("gives the member's calendar day, not the server's", () => {
    expect(todayIsoIn("America/Los_Angeles", now)).toBe("2026-10-03");
    expect(todayIsoIn("Europe/London", now)).toBe("2026-10-04");
    expect(todayIsoIn("Pacific/Auckland", now)).toBe("2026-10-04");
  });

  it("falls back to the server's day for a missing or bogus zone", () => {
    expect(todayIsoIn(null, now)).toBe(toIsoDate(now));
    expect(todayIsoIn("Mars/Olympus_Mons", now)).toBe(toIsoDate(now));
  });
});

describe("isValidTimeZone", () => {
  it("knows real zones from junk", () => {
    expect(isValidTimeZone("America/New_York")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("Not/AZone")).toBe(false);
    expect(isValidTimeZone("<script>")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });
});

describe("zonedTimeToUtc", () => {
  it("turns a wall-clock time in the member's zone into the right instant", () => {
    // 8:15 AM in Los Angeles on Oct 3, 2026 (PDT, UTC-7) is 15:15 UTC.
    expect(zonedTimeToUtc("2026-10-03", "08:15", "America/Los_Angeles").toISOString()).toBe(
      "2026-10-03T15:15:00.000Z",
    );
    // Same wall time in Tokyo (UTC+9) is 23:15 UTC the day before.
    expect(zonedTimeToUtc("2026-10-03", "08:15", "Asia/Tokyo").toISOString()).toBe(
      "2026-10-02T23:15:00.000Z",
    );
  });

  it("handles standard time after the DST change", () => {
    // Dec 1, 2026 in New York is EST (UTC-5).
    expect(zonedTimeToUtc("2026-12-01", "08:00", "America/New_York").toISOString()).toBe(
      "2026-12-01T13:00:00.000Z",
    );
  });

  it("uses server-local time when no zone is known", () => {
    const local = zonedTimeToUtc("2026-10-03", "08:15", null);
    expect(local.getHours()).toBe(8);
    expect(local.getMinutes()).toBe(15);
  });
});
