// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

// The guard under test runs before any statement is built; the client must never be touched.
const dbMock = vi.hoisted(() => ({ insert: vi.fn() }));
vi.mock("@/db/client", () => ({ db: dbMock }));

const { reserveAiUsage } = await import("./queries");
const DAY = new Date("2030-01-15T12:00:00");

describe("reserveAiUsage limit guard", () => {
  it("refuses a limit that doesn't fit a Postgres integer before reaching the database", async () => {
    // The old owner exemption: bound against `integer` it fails the whole statement (22003),
    // which took every AI action down for the owner in production.
    await expect(reserveAiUsage("u1", DAY, Number.MAX_SAFE_INTEGER)).rejects.toThrow(RangeError);
    await expect(reserveAiUsage("u1", DAY, 2_147_483_648)).rejects.toThrow(RangeError);
    await expect(reserveAiUsage("u1", DAY, 0)).rejects.toThrow(RangeError);
    await expect(reserveAiUsage("u1", DAY, 2.5)).rejects.toThrow(RangeError);
    await expect(reserveAiUsage("u1", DAY, Number.NaN)).rejects.toThrow(RangeError);
    expect(dbMock.insert).not.toHaveBeenCalled();
  });
});
