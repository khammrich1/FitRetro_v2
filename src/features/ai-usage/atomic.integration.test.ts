// @vitest-environment node
//
// Concurrency proofs that need a real Postgres: set INTEGRATION_DATABASE_URL (CI does, after
// db:migrate). Skipped otherwise.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const url = process.env.INTEGRATION_DATABASE_URL;
if (url) process.env.DATABASE_URL = url;

vi.mock("server-only", () => ({}));
// The reading generator is the paid call; count invocations instead of calling Anthropic.
const generate = vi.hoisted(() => ({ calls: 0 }));
vi.mock("@/features/daily-reading/generate", () => ({
  generateDailyReading: async () => {
    generate.calls++;
    await new Promise((r) => setTimeout(r, 50));
    return { title: "T", body: "B", readMinutes: 1 };
  },
}));

const { sql } = await import("drizzle-orm");
const db = url ? (await import("@/db/client")).db : null;
const usage = url ? await import("./queries") : null;
const reading = url ? await import("@/features/daily-reading/queries") : null;

const USER_ID = "7a1c3f8e-0000-4000-8000-00000000a1a1";
const DAY = new Date("2030-01-15T12:00:00");
const DAY_ISO = "2030-01-15";

beforeAll(async () => {
  if (!db) return;
  await db.execute(
    sql`INSERT INTO users (id, email, password_hash, display_name) VALUES (${USER_ID}, 'atomic-test@example.com', 'x', 'Atomic') ON CONFLICT (id) DO NOTHING`,
  );
});

afterAll(async () => {
  if (!db) return;
  await db.execute(sql`DELETE FROM ai_usage WHERE user_id = ${USER_ID}`);
  await db.execute(sql`DELETE FROM users WHERE id = ${USER_ID}`);
  await db.execute(sql`DELETE FROM daily_readings WHERE day = ${DAY_ISO}`);
  await db.execute(sql`DELETE FROM daily_reading_jobs WHERE day = ${DAY_ISO}`);
});

describe.skipIf(!url)("reserveAiUsage (real Postgres)", () => {
  it("admits exactly `limit` of a concurrent burst, never more", async () => {
    const results = await Promise.all(
      Array.from({ length: 30 }, () => usage!.reserveAiUsage(USER_ID, DAY, 20)),
    );
    expect(results.filter((r) => r !== null)).toHaveLength(20);
    expect(await usage!.getAiUsageCountForDay(USER_ID, DAY)).toBe(20);
  });

  it("stays full afterwards", async () => {
    expect(await usage!.reserveAiUsage(USER_ID, DAY, 20)).toBeNull();
  });

  // Issue #56. Postgres infers the parameter's type from the column it is compared with, so a
  // JavaScript number beyond int4 fails the statement outright — this is the production crash.
  it("proves the old owner sentinel fails against the integer column (SQLSTATE 22003)", async () => {
    await expect(
      db!.execute(
        sql`UPDATE ai_usage SET count = count WHERE user_id = ${USER_ID} AND count < ${Number.MAX_SAFE_INTEGER}`,
      ),
    ).rejects.toMatchObject({ cause: { code: "22003" } }); // Drizzle wraps the PostgresError
  });

  it("admits the uncapped owner past the member limit and keeps counting", async () => {
    // The row is already full at 20 for a member; with no cap the same row keeps incrementing.
    expect(await usage!.reserveAiUsage(USER_ID, DAY, null)).toBe(21);
    const results = await Promise.all(
      Array.from({ length: 10 }, () => usage!.reserveAiUsage(USER_ID, DAY, null)),
    );
    expect(results.every((r) => r !== null)).toBe(true);
    expect(await usage!.getAiUsageCountForDay(USER_ID, DAY)).toBe(31);
    expect(await usage!.getAiUsageTotalForDay(DAY)).toBeGreaterThanOrEqual(31);
  });

  it("refuses an out-of-range limit before it reaches the database", async () => {
    await expect(usage!.reserveAiUsage(USER_ID, DAY, Number.MAX_SAFE_INTEGER)).rejects.toThrow(
      RangeError,
    );
    expect(await usage!.getAiUsageCountForDay(USER_ID, DAY)).toBe(31);
  });
});

describe.skipIf(!url)("Daily Reader single-flight (real Postgres)", () => {
  it("generates once for a burst of concurrent cache misses", async () => {
    generate.calls = 0;
    await Promise.all(
      Array.from({ length: 10 }, () => reading!.generateAndCacheReading(DAY_ISO, "discipline")),
    );
    expect(generate.calls).toBe(1);
    const rows = await db!.execute(
      sql`SELECT count(*)::int AS n FROM daily_readings WHERE day = ${DAY_ISO} AND topic = 'discipline'`,
    );
    expect(Number(rows[0].n)).toBe(1);
  });

  it("hands the lease to a new attempt only once the old one has expired", async () => {
    await db!.execute(sql`DELETE FROM daily_readings WHERE day = ${DAY_ISO}`);
    expect(await reading!.claimReadingJob(DAY_ISO, "leadership")).toBe(true);
    expect(await reading!.claimReadingJob(DAY_ISO, "leadership")).toBe(false);
    await db!.execute(
      sql`UPDATE daily_reading_jobs SET claimed_at = now() - interval '11 minutes' WHERE day = ${DAY_ISO} AND topic = 'leadership'`,
    );
    expect(await reading!.claimReadingJob(DAY_ISO, "leadership")).toBe(true);
  });
});
