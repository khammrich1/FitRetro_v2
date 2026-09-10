import { describe, expect, it } from "vitest";
import {
  computeLastActivityByUser,
  countActiveSince,
  summarizePageViewTraffic,
  toOwnerDayIso,
  type ActivityRow,
} from "./queries";

describe("computeLastActivityByUser", () => {
  it("keeps only the most recent day per user, across sources", () => {
    const rows: ActivityRow[] = [
      { userId: "u1", day: "2026-09-01", source: "nutrition" },
      { userId: "u1", day: "2026-09-05", source: "workout" },
      { userId: "u2", day: "2026-09-03", source: "water" },
    ];

    const result = computeLastActivityByUser(rows);

    expect(result.get("u1")).toEqual({ day: "2026-09-05", source: "workout" });
    expect(result.get("u2")).toEqual({ day: "2026-09-03", source: "water" });
    expect(result.has("u3")).toBe(false);
  });

  it("isolates activity by user — one user's rows never affect another's result", () => {
    const rows: ActivityRow[] = [
      { userId: "u1", day: "2026-09-09", source: "peptide" },
      { userId: "u2", day: "2026-09-01", source: "supplement" },
    ];

    const result = computeLastActivityByUser(rows);

    expect(result.get("u1")?.day).toBe("2026-09-09");
    expect(result.get("u2")?.day).toBe("2026-09-01");
  });

  it("returns an empty map for no rows", () => {
    expect(computeLastActivityByUser([]).size).toBe(0);
  });
});

describe("countActiveSince", () => {
  it("counts users whose last activity is on or after the boundary day", () => {
    const lastActivityByUser = new Map([
      ["u1", { day: "2026-09-10", source: "nutrition" as const }],
      ["u2", { day: "2026-09-03", source: "water" as const }],
      ["u3", { day: "2026-08-01", source: "workout" as const }],
    ]);

    expect(countActiveSince(lastActivityByUser, "2026-09-03")).toBe(2);
    expect(countActiveSince(lastActivityByUser, "2026-09-10")).toBe(1);
    expect(countActiveSince(lastActivityByUser, "2026-01-01")).toBe(3);
  });

  it("returns 0 when nobody has been active", () => {
    expect(countActiveSince(new Map(), "2026-09-01")).toBe(0);
  });
});

describe("summarizePageViewTraffic", () => {
  it("splits hits into authenticated vs anonymous and counts unique authed users", () => {
    const result = summarizePageViewTraffic([
      { path: "/today", userId: "u1" },
      { path: "/today", userId: "u1" },
      { path: "/today", userId: "u2" },
      { path: "/today", userId: null },
      { path: "/login", userId: null },
    ]);

    expect(result).toEqual([
      { path: "/today", hits: 4, uniqueAuthUsers: 2, authHits: 3, unauthHits: 1 },
      { path: "/login", hits: 1, uniqueAuthUsers: 0, authHits: 0, unauthHits: 1 },
    ]);
  });

  it("returns an empty list for no rows", () => {
    expect(summarizePageViewTraffic([])).toEqual([]);
  });
});

describe("toOwnerDayIso", () => {
  it("formats a date as YYYY-MM-DD in the owner's timezone", () => {
    // Noon UTC is always the same calendar day in America/Los_Angeles.
    expect(toOwnerDayIso(new Date("2026-03-15T12:00:00Z"))).toBe("2026-03-15");
  });
});
