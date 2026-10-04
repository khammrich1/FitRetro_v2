// @vitest-environment node
//
// Runs only when INTEGRATION_DATABASE_URL points at a migrated Postgres (CI sets it after
// db:migrate; locally: INTEGRATION_DATABASE_URL=$DATABASE_URL npm run test). The point of the
// limiter is that it's atomic under concurrency, which can only be proven against a real DB.
import { afterAll, describe, expect, it, vi } from "vitest";

const url = process.env.INTEGRATION_DATABASE_URL;
if (url) process.env.DATABASE_URL = url;

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const { consumeRateLimit } = url ? await import("./rate-limit") : { consumeRateLimit: null };
const { db } = url ? await import("@/db/client") : { db: null };
const { sql } = await import("drizzle-orm");

const key = `test:${Date.now()}:${Math.random().toString(36).slice(2)}`;

afterAll(async () => {
  if (db) await db.execute(sql`DELETE FROM rate_limits WHERE key LIKE 'test:%'`);
});

describe.skipIf(!url)("consumeRateLimit (real Postgres)", () => {
  it("admits exactly `limit` attempts out of a concurrent burst", async () => {
    const rule = { key, limit: 5, windowSeconds: 60 };
    const results = await Promise.all(Array.from({ length: 25 }, () => consumeRateLimit!(rule)));
    expect(results.filter((r) => r.allowed)).toHaveLength(5);
    expect(results.filter((r) => !r.allowed)).toHaveLength(20);
  });

  it("starts a fresh window once the old one has expired", async () => {
    const rule = { key: `${key}:window`, limit: 1, windowSeconds: 60 };
    expect((await consumeRateLimit!(rule)).allowed).toBe(true);
    expect((await consumeRateLimit!(rule)).allowed).toBe(false);
    await db!.execute(
      sql`UPDATE rate_limits SET window_start = now() - interval '2 minutes' WHERE key = ${rule.key}`,
    );
    expect((await consumeRateLimit!(rule)).allowed).toBe(true);
  });
});
