// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";

const mocks = vi.hoisted(() => ({ apply: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/features/billing", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/billing")>()),
  applySubscriptionEvent: mocks.apply,
}));

// Fake, test-only values: signatures are generated and verified for real, locally.
const WEBHOOK_SECRET = "whsec_test_placeholder_for_unit_tests";
vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_placeholder_for_unit_tests");
vi.stubEnv("STRIPE_WEBHOOK_SECRET", WEBHOOK_SECRET);

const { POST } = await import("./route");
const signer = new Stripe("sk_test_placeholder_for_unit_tests");

function subscriptionEvent(metadata: Record<string, string>) {
  return JSON.stringify({
    id: "evt_test",
    object: "event",
    type: "customer.subscription.created",
    created: 1_800_000_000,
    data: {
      object: {
        id: "sub_test",
        object: "subscription",
        created: 1_799_999_000,
        status: "trialing",
        cancel_at_period_end: false,
        metadata,
        items: { object: "list", data: [{ id: "si_test", current_period_end: 1_900_000_000 }] },
      },
    },
  });
}

function deliver(payload: string, signedPayload = payload) {
  return POST(
    new Request("https://fitretro.app/api/stripe/webhook", {
      method: "POST",
      headers: {
        "stripe-signature": signer.webhooks.generateTestHeaderString({
          payload: signedPayload,
          secret: WEBHOOK_SECRET,
        }),
      },
      body: payload,
    }),
  );
}

beforeEach(() => {
  mocks.apply.mockReset().mockResolvedValue("applied");
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("Stripe webhook campaign attribution", () => {
  it("records campaign promo1 from the subscription's metadata", async () => {
    const response = await deliver(
      subscriptionEvent({ userId: "user-1", campaign: "promo1", acquisition_source: "sticker" }),
    );

    expect(response.status).toBe(200);
    expect(mocks.apply).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription: expect.objectContaining({
          userId: "user-1",
          stripeSubscriptionId: "sub_test",
          campaign: "promo1",
        }),
      }),
    );
  });

  it("records no campaign for a normal checkout", async () => {
    await deliver(subscriptionEvent({ userId: "user-1" }));
    expect(mocks.apply).toHaveBeenCalledWith(
      expect.objectContaining({ subscription: expect.objectContaining({ campaign: null }) }),
    );
  });

  it("ignores an unrecognized campaign value (e.g. hand-edited in the dashboard)", async () => {
    await deliver(subscriptionEvent({ userId: "user-1", campaign: "promo9" }));
    expect(mocks.apply).toHaveBeenCalledWith(
      expect.objectContaining({ subscription: expect.objectContaining({ campaign: null }) }),
    );
  });

  it("rejects a payload that doesn't match its signature", async () => {
    const signed = subscriptionEvent({ userId: "user-1" });
    const tampered = subscriptionEvent({ userId: "user-1", campaign: "promo1" });

    const response = await deliver(tampered, signed);

    expect(response.status).toBe(400);
    expect(mocks.apply).not.toHaveBeenCalled();
  });
});

describe("Stripe webhook ledger and retries", () => {
  it("passes the event id and timestamps the ledger and ordering need", async () => {
    await deliver(subscriptionEvent({ userId: "user-1" }));
    expect(mocks.apply).toHaveBeenCalledWith({
      event: {
        id: "evt_test",
        type: "customer.subscription.created",
        created: new Date(1_800_000_000 * 1000),
      },
      subscription: expect.objectContaining({
        stripeSubscriptionCreated: new Date(1_799_999_000 * 1000),
        currentPeriodEnd: new Date(1_900_000_000 * 1000),
      }),
    });
  });

  it("acknowledges a duplicate or stale event with 200 so Stripe stops resending it", async () => {
    for (const result of ["duplicate", "stale_event", "stale_subscription"] as const) {
      mocks.apply.mockResolvedValue(result);
      const response = await deliver(subscriptionEvent({ userId: "user-1" }));
      expect(response.status).toBe(200);
    }
  });

  it("answers 500 when the write fails, so Stripe redelivers, without logging secrets", async () => {
    mocks.apply.mockRejectedValue(
      Object.assign(new Error("secret-bearing message sk_test_abc"), {
        type: "StripeConnectionError",
        code: "ECONNRESET",
      }),
    );
    const response = await deliver(subscriptionEvent({ userId: "user-1" }));
    expect(response.status).toBe(500);
    const logged = vi.mocked(console.error).mock.calls.flat().join(" ");
    expect(logged).toContain("StripeConnectionError/ECONNRESET");
    expect(logged).not.toContain("sk_test_abc");
  });
});
