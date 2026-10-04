// @vitest-environment node
// Advisory-lock serialisation against a real Postgres (INTEGRATION_DATABASE_URL; CI sets it).
import { describe, expect, it, vi } from "vitest";

const url = process.env.INTEGRATION_DATABASE_URL;
if (url) process.env.DATABASE_URL = url;

vi.mock("server-only", () => ({}));

const lock = url ? await import("./lock") : null;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe.skipIf(!url)("withCheckoutLock (real Postgres)", () => {
  it("runs two checkouts for the same user one after the other, never overlapping", async () => {
    const log: string[] = [];
    const checkout = (name: string) =>
      lock!.withCheckoutLock("user-same", async () => {
        log.push(`${name}:start`);
        await sleep(150);
        log.push(`${name}:end`);
      });
    await Promise.all([checkout("A"), checkout("B")]);
    // Whichever went first, its end comes before the other's start.
    expect(log).toEqual(
      log[0] === "A:start"
        ? ["A:start", "A:end", "B:start", "B:end"]
        : ["B:start", "B:end", "A:start", "A:end"],
    );
  });

  it("lets different users' checkouts overlap", async () => {
    const log: string[] = [];
    const checkout = (user: string) =>
      lock!.withCheckoutLock(user, async () => {
        log.push(`${user}:start`);
        await sleep(150);
        log.push(`${user}:end`);
      });
    await Promise.all([checkout("user-1"), checkout("user-2")]);
    expect(log.slice(0, 2).every((entry) => entry.endsWith(":start"))).toBe(true);
  });

  it("releases the lock when the work throws (how redirect() leaves a server action)", async () => {
    await expect(
      lock!.withCheckoutLock("user-throws", async () => {
        throw new Error("NEXT_REDIRECT");
      }),
    ).rejects.toThrow("NEXT_REDIRECT");
    // If the lock had leaked, this would hang; the timeout is the assertion.
    await lock!.withCheckoutLock("user-throws", async () => {});
  }, 5000);
});
