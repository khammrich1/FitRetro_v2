// @vitest-environment node
//
// Webhook ledger + ordering against a real Postgres (INTEGRATION_DATABASE_URL; CI sets it).
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const url = process.env.INTEGRATION_DATABASE_URL;
if (url) process.env.DATABASE_URL = url;

vi.mock("server-only", () => ({}));

const { sql } = await import("drizzle-orm");
const db = url ? (await import("@/db/client")).db : null;
const billing = url ? await import("./queries") : null;

const USER_ID = "7a1c3f8e-0000-4000-8000-00000000b1b1";
const t = (iso: string) => new Date(iso);

function event(
  id: string,
  created: string,
  sub: Partial<Parameters<typeof applyFn>[0]["subscription"]>,
) {
  return {
    event: { id, type: "customer.subscription.updated", created: t(created) },
    subscription: {
      userId: USER_ID,
      stripeSubscriptionId: "sub_A",
      stripeSubscriptionCreated: t("2026-09-01T00:00:00Z"),
      status: "active" as const,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      campaign: null,
      ...sub,
    },
  };
}
type ApplyFn = NonNullable<typeof billing>["applySubscriptionEvent"];
const applyFn = (billing?.applySubscriptionEvent ?? (async () => "applied")) as ApplyFn;

async function stored() {
  const rows = await db!.execute(
    sql`SELECT stripe_subscription_id, status FROM subscriptions WHERE user_id = ${USER_ID}`,
  );
  return rows[0] as { stripe_subscription_id: string; status: string } | undefined;
}

beforeAll(async () => {
  if (!db) return;
  await db.execute(
    sql`INSERT INTO users (id, email, password_hash, display_name) VALUES (${USER_ID}, 'events-test@example.com', 'x', 'Events') ON CONFLICT (id) DO NOTHING`,
  );
});

afterAll(async () => {
  if (!db) return;
  await db.execute(sql`DELETE FROM subscriptions WHERE user_id = ${USER_ID}`);
  await db.execute(sql`DELETE FROM stripe_events WHERE id LIKE 'evt_test_%'`);
  await db.execute(sql`DELETE FROM users WHERE id = ${USER_ID}`);
});

describe.skipIf(!url)("applySubscriptionEvent (real Postgres)", () => {
  it("applies the first event and ignores a redelivery of it", async () => {
    const first = event("evt_test_1", "2026-10-04T10:00:00Z", {});
    expect(await applyFn(first)).toBe("applied");
    expect(
      await applyFn({ ...first, subscription: { ...first.subscription, status: "canceled" } }),
    ).toBe("duplicate");
    expect((await stored())?.status).toBe("active");
  });

  it("ignores an older event about the same subscription that arrives late", async () => {
    expect(await applyFn(event("evt_test_2", "2026-10-04T09:00:00Z", { status: "past_due" }))).toBe(
      "stale_event",
    );
    expect((await stored())?.status).toBe("active");
  });

  it("lets a newer replacement subscription take over", async () => {
    expect(
      await applyFn(
        event("evt_test_3", "2026-10-04T12:00:00Z", {
          stripeSubscriptionId: "sub_B",
          stripeSubscriptionCreated: t("2026-10-04T12:00:00Z"),
          status: "trialing",
        }),
      ),
    ).toBe("applied");
    expect(await stored()).toMatchObject({ stripe_subscription_id: "sub_B", status: "trialing" });
  });

  it("ignores the old subscription's late 'deleted' even though the event itself is newer", async () => {
    expect(await applyFn(event("evt_test_4", "2026-10-04T12:30:00Z", { status: "canceled" }))).toBe(
      "stale_subscription",
    );
    expect(await stored()).toMatchObject({ stripe_subscription_id: "sub_B", status: "trialing" });
  });

  it("applies a concurrent burst of the same event exactly once", async () => {
    const burst = event("evt_test_5", "2026-10-04T13:00:00Z", {
      stripeSubscriptionId: "sub_B",
      stripeSubscriptionCreated: t("2026-10-04T12:00:00Z"),
      status: "active",
    });
    const results = await Promise.all(Array.from({ length: 8 }, () => applyFn(burst)));
    expect(results.filter((r) => r === "applied")).toHaveLength(1);
    expect(results.filter((r) => r === "duplicate")).toHaveLength(7);
  });
});
