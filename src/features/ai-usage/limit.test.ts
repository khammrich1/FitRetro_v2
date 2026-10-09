// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUserById: vi.fn(),
  reserveAiUsage: vi.fn(),
  getAiUsageTotalForDay: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/features/auth", () => ({
  getUserById: mocks.getUserById,
  isOwner: (email: string) => email === "owner@example.com",
}));
vi.mock("./queries", () => ({
  reserveAiUsage: mocks.reserveAiUsage,
  getAiUsageTotalForDay: mocks.getAiUsageTotalForDay,
}));

const { checkAiUsageAllowed, DAILY_AI_ACTION_LIMIT, SITE_LIMIT_MESSAGE, globalDailyAiLimit } =
  await import("./limit");
const { AI_UNAVAILABLE_MESSAGE } = await import("./failure");

beforeEach(() => {
  mocks.getUserById.mockReset().mockResolvedValue({ id: "u1", email: "member@example.com" });
  mocks.reserveAiUsage.mockReset().mockResolvedValue(1);
  mocks.getAiUsageTotalForDay.mockReset().mockResolvedValue(0);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("checkAiUsageAllowed", () => {
  it("admits a member by reserving a slot against the per-user limit", async () => {
    expect(await checkAiUsageAllowed("u1")).toEqual({ allowed: true });
    expect(mocks.reserveAiUsage).toHaveBeenCalledWith(
      "u1",
      expect.any(Date),
      DAILY_AI_ACTION_LIMIT,
    );
  });

  it("refuses when the reservation comes back full — the decision is the database's, not a read", async () => {
    mocks.reserveAiUsage.mockResolvedValue(null);
    const result = await checkAiUsageAllowed("u1");
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.error).toMatch(/limit of 20 AI actions/);
  });

  it("exempts the owner from the per-user cap but still counts them", async () => {
    mocks.getUserById.mockResolvedValue({ id: "o", email: "owner@example.com" });
    expect(await checkAiUsageAllowed("o")).toEqual({ allowed: true });
    // Explicit "no cap", not a sentinel: ai_usage.count is a Postgres integer, and
    // MAX_SAFE_INTEGER bound against it fails the statement (issue #56).
    expect(mocks.reserveAiUsage).toHaveBeenCalledWith("o", expect.any(Date), null);
  });

  it("refuses, without crashing, when the counter can't be reserved", async () => {
    const dbError = Object.assign(new Error('value "9007199254740991" is out of range'), {
      code: "22003",
    });
    mocks.reserveAiUsage.mockRejectedValue(dbError);
    const result = await checkAiUsageAllowed("u1");
    expect(result).toEqual({ allowed: false, error: AI_UNAVAILABLE_MESSAGE });
    expect(console.error).toHaveBeenCalledWith("AI admission failed", "Error", "22003");
  });

  it("refuses, without crashing, when the site-wide total can't be read", async () => {
    mocks.getAiUsageTotalForDay.mockRejectedValue(new Error("connection refused"));
    expect(await checkAiUsageAllowed("u1")).toEqual({
      allowed: false,
      error: AI_UNAVAILABLE_MESSAGE,
    });
    expect(mocks.reserveAiUsage).not.toHaveBeenCalled();
  });

  it("stops everyone, owner included, at the site-wide ceiling", async () => {
    mocks.getAiUsageTotalForDay.mockResolvedValue(globalDailyAiLimit());
    mocks.getUserById.mockResolvedValue({ id: "o", email: "owner@example.com" });
    expect(await checkAiUsageAllowed("o")).toEqual({ allowed: false, error: SITE_LIMIT_MESSAGE });
    expect(mocks.reserveAiUsage).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("site-wide daily limit"));
  });

  it("refuses oversized input before touching any counter", async () => {
    const result = await checkAiUsageAllowed("u1", { input: "x".repeat(4001) });
    expect(result).toEqual({ allowed: false, error: expect.stringMatching(/too long/) });
    expect(mocks.reserveAiUsage).not.toHaveBeenCalled();
    expect(mocks.getAiUsageTotalForDay).not.toHaveBeenCalled();
    expect(await checkAiUsageAllowed("u1", { input: "x".repeat(4000) })).toEqual({
      allowed: true,
    });
  });

  it("counts the day in the member's time zone", async () => {
    // 03:30 UTC on Oct 4 is still Oct 3 in Los Angeles.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-04T03:30:00Z"));
    mocks.getUserById.mockResolvedValue({
      id: "u1",
      email: "member@example.com",
      timezone: "America/Los_Angeles",
    });
    await checkAiUsageAllowed("u1");
    const [, day] = mocks.reserveAiUsage.mock.calls[0];
    expect(
      `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`,
    ).toBe("2026-10-03");
    vi.useRealTimers();
  });

  it("reads the site-wide ceiling from the environment, ignoring junk", () => {
    vi.stubEnv("AI_DAILY_GLOBAL_LIMIT", "250");
    expect(globalDailyAiLimit()).toBe(250);
    vi.stubEnv("AI_DAILY_GLOBAL_LIMIT", "lots");
    expect(globalDailyAiLimit()).toBe(1000);
    vi.stubEnv("AI_DAILY_GLOBAL_LIMIT", "-5");
    expect(globalDailyAiLimit()).toBe(1000);
  });
});
