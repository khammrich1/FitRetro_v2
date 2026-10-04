import "server-only";
import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

export type RateLimitRule = {
  /** What's being limited and for whom, e.g. "login:ip:1.2.3.4". */
  key: string;
  /** Attempts allowed per window. */
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/** Decides from a counter row whether this attempt (already counted) is within the limit. Split
 * out so the arithmetic is unit-testable without a database. */
export function decideRateLimit(
  rule: Pick<RateLimitRule, "limit" | "windowSeconds">,
  row: { count: number; windowStart: Date },
  now: Date = new Date(),
): RateLimitResult {
  if (row.count <= rule.limit) return { allowed: true };
  const windowEnd = row.windowStart.getTime() + rule.windowSeconds * 1000;
  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((windowEnd - now.getTime()) / 1000)),
  };
}

/** Counts one attempt against `rule.key` and says whether it's allowed. The count-or-reset is a
 * single upsert, so concurrent attempts can't all slip under the limit the way a read-then-write
 * would let them: Postgres serialises the row and each caller sees its own exact count. */
export async function consumeRateLimit(rule: RateLimitRule): Promise<RateLimitResult> {
  const window = sql`make_interval(secs => ${rule.windowSeconds})`;
  const [row] = await db.execute<{ count: number; window_start: Date }>(sql`
    INSERT INTO rate_limits (key, window_start, count)
    VALUES (${rule.key}, now(), 1)
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN rate_limits.window_start < now() - ${window} THEN 1
        ELSE rate_limits.count + 1
      END,
      window_start = CASE
        WHEN rate_limits.window_start < now() - ${window} THEN now()
        ELSE rate_limits.window_start
      END
    RETURNING count, window_start
  `);
  // Sweep long-dead rows now and then; the table only ever holds one row per active key.
  if (Math.random() < 0.02) {
    void db
      .execute(sql`DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'`)
      .catch(() => {});
  }
  return decideRateLimit(rule, {
    count: Number(row.count),
    windowStart: new Date(row.window_start),
  });
}

/** Forgets a key's count — used when the thing being guarded succeeds (a correct password proves
 * possession), so a person who logs in often can't throttle themselves. */
export async function clearRateLimit(key: string): Promise<void> {
  await db.execute(sql`DELETE FROM rate_limits WHERE key = ${key}`);
}

/** Applies several rules at once (e.g. per-IP and per-account); the first one exceeded wins. All
 * are counted even if an earlier one fails, so a blocked IP can't probe accounts for free. */
export async function consumeRateLimits(rules: RateLimitRule[]): Promise<RateLimitResult> {
  const results = await Promise.all(rules.map(consumeRateLimit));
  return results.find((r) => !r.allowed) ?? { allowed: true };
}

/** Best-effort client IP for keying limits. Behind a reverse proxy the first X-Forwarded-For entry
 * is the client; with none, "unknown" shares one bucket, which still bounds total abuse. */
export async function requestIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || h.get("x-real-ip")?.trim() || "unknown";
  return ip.slice(0, 64);
}

export function tooManyAttemptsMessage(result: { retryAfterSeconds: number }): string {
  const minutes = Math.ceil(result.retryAfterSeconds / 60);
  return `Too many attempts. Please wait ${minutes === 1 ? "a minute" : `${minutes} minutes`} and try again.`;
}
