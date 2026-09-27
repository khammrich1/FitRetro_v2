// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";

const mocks = vi.hoisted(() => ({ upsert: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/features/billing", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/billing")>()),
  upsertSubscriptionFromStripe: mocks.upsert,
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
    data: {
      object: {
        id: "sub_test",
        object: "subscription",
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
  mocks.upsert.mockReset().mockResolvedValue(undefined);
});

describe("Stripe webhook campaign attribution", () => {
  it("records campaign promo1 from the subscription's metadata", async () => {
    const response = await deliver(
      subscriptionEvent({ userId: "user-1", campaign: "promo1", acquisition_source: "sticker" }),
    );

    expect(response.status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        stripeSubscriptionId: "sub_test",
        campaign: "promo1",
      }),
    );
  });

  it("records no campaign for a normal checkout", async () => {
    await deliver(subscriptionEvent({ userId: "user-1" }));
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ campaign: null }));
  });

  it("ignores an unrecognized campaign value (e.g. hand-edited in the dashboard)", async () => {
    await deliver(subscriptionEvent({ userId: "user-1", campaign: "promo9" }));
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ campaign: null }));
  });

  it("rejects a payload that doesn't match its signature", async () => {
    const signed = subscriptionEvent({ userId: "user-1" });
    const tampered = subscriptionEvent({ userId: "user-1", campaign: "promo1" });

    const response = await deliver(tampered, signed);

    expect(response.status).toBe(400);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
