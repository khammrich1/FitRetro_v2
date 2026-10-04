// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const { decideRateLimit, tooManyAttemptsMessage } = await import("./rate-limit");

const rule = { limit: 5, windowSeconds: 900 };
const start = new Date("2026-10-04T10:00:00Z");

describe("decideRateLimit", () => {
  it("allows up to and including the limit", () => {
    expect(decideRateLimit(rule, { count: 1, windowStart: start })).toEqual({ allowed: true });
    expect(decideRateLimit(rule, { count: 5, windowStart: start })).toEqual({ allowed: true });
  });

  it("blocks past the limit and says how long until the window ends", () => {
    const now = new Date("2026-10-04T10:05:00Z");
    expect(decideRateLimit(rule, { count: 6, windowStart: start }, now)).toEqual({
      allowed: false,
      retryAfterSeconds: 600,
    });
  });

  it("never reports a zero or negative wait", () => {
    const now = new Date("2026-10-04T10:15:30Z");
    const result = decideRateLimit(rule, { count: 99, windowStart: start }, now);
    expect(result).toEqual({ allowed: false, retryAfterSeconds: 1 });
  });
});

describe("tooManyAttemptsMessage", () => {
  it("rounds up to whole minutes in plain words", () => {
    expect(tooManyAttemptsMessage({ retryAfterSeconds: 30 })).toBe(
      "Too many attempts. Please wait a minute and try again.",
    );
    expect(tooManyAttemptsMessage({ retryAfterSeconds: 610 })).toBe(
      "Too many attempts. Please wait 11 minutes and try again.",
    );
  });
});
