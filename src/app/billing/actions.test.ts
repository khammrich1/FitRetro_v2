// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";

const mocks = vi.hoisted(() => {
  class RedirectError extends Error {
    constructor(public readonly url: string) {
      super(`NEXT_REDIRECT ${url}`);
    }
  }
  const jar = new Map<string, string>();
  const cookieStore = {
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: vi.fn((name: string, value: string) => {
      jar.set(name, value);
    }),
    delete: vi.fn((arg: string | { name: string }) => {
      jar.delete(typeof arg === "string" ? arg : arg.name);
    }),
  };
  const stripe = {
    promotionCodes: { list: vi.fn() },
    subscriptions: { list: vi.fn() },
    checkout: { sessions: { create: vi.fn(), list: vi.fn(), expire: vi.fn() } },
    billingPortal: { sessions: { create: vi.fn() } },
  };
  return {
    RedirectError,
    jar,
    cookieStore,
    stripe,
    getOrCreateStripeCustomer: vi.fn(),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => mocks.cookieStore,
  headers: async () => new Headers({ origin: "https://fitretro.app" }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new mocks.RedirectError(url);
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
// Only the network-facing pieces are faked: the real config readers (STRIPE_PRICE_ID,
// STRIPE_PROMO_CODE) and the real verifySession() stay in play.
vi.mock("@/lib/stripe", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/stripe")>()),
  getStripeClient: () => mocks.stripe,
}));
vi.mock("@/features/billing", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/billing")>()),
  getOrCreateStripeCustomer: mocks.getOrCreateStripeCustomer,
}));

const { createCheckoutSessionAction, createBillingPortalSessionAction, dismissStickerOfferAction } =
  await import("./actions");

const SESSION_SECRET = "test-session-secret-not-a-real-credential";
const USER_ID = "7a1c3f8e-0000-4000-8000-000000000001";
const CHECKOUT_URL = "https://checkout.stripe.com/c/pay/cs_test_placeholder";
const ACTIVE_PROMOTION_CODE = {
  id: "promo_sticker_placeholder",
  object: "promotion_code",
  code: "FREEMONTH",
  active: true,
  expires_at: null,
  max_redemptions: null,
  times_redeemed: 0,
};
const STICKER_METADATA = { userId: USER_ID, campaign: "promo1", acquisition_source: "sticker" };

async function signIn() {
  const token = await new SignJWT({ userId: USER_ID })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(SESSION_SECRET));
  mocks.jar.set("session", token);
}

function arriveViaSticker() {
  mocks.jar.set("fr_campaign", "promo1");
}

async function redirectTarget(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (error) {
    if (error instanceof mocks.RedirectError) return error.url;
    throw error;
  }
  throw new Error("Expected the action to redirect.");
}

function checkoutParams() {
  expect(mocks.stripe.checkout.sessions.create).toHaveBeenCalledTimes(1);
  return mocks.stripe.checkout.sessions.create.mock.calls[0][0];
}

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", SESSION_SECRET);
  vi.stubEnv("STRIPE_PRICE_ID", "price_test_placeholder");
  vi.stubEnv("STRIPE_PROMO_CODE", "FREEMONTH");
  mocks.jar.clear();
  mocks.cookieStore.set.mockClear();
  mocks.cookieStore.delete.mockClear();
  mocks.stripe.promotionCodes.list.mockReset().mockResolvedValue({ data: [ACTIVE_PROMOTION_CODE] });
  mocks.stripe.checkout.sessions.create.mockReset().mockResolvedValue({ url: CHECKOUT_URL });
  mocks.stripe.checkout.sessions.list.mockReset().mockResolvedValue({ data: [] });
  mocks.stripe.checkout.sessions.expire.mockReset().mockResolvedValue({});
  mocks.stripe.subscriptions.list.mockReset().mockResolvedValue({ data: [] });
  mocks.stripe.billingPortal.sessions.create.mockReset();
  mocks.getOrCreateStripeCustomer.mockReset().mockResolvedValue("cus_test_placeholder");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("sticker-attributed checkout (campaign promo1)", () => {
  beforeEach(async () => {
    await signIn();
    arriveViaSticker();
  });

  it("looks up the configured promotion code and applies it automatically", async () => {
    const target = await redirectTarget(() => createCheckoutSessionAction());

    expect(target).toBe(CHECKOUT_URL);
    expect(mocks.stripe.promotionCodes.list).toHaveBeenCalledWith({
      code: "FREEMONTH",
      active: true,
      limit: 1,
    });
    const params = checkoutParams();
    expect(params.discounts).toEqual([{ promotion_code: "promo_sticker_placeholder" }]);
    // No manual "enter a code" step: Stripe forbids it alongside a pre-applied discount anyway.
    expect(params).not.toHaveProperty("allow_promotion_codes");
    expect(params.mode).toBe("subscription");
    expect(params.line_items).toEqual([{ price: "price_test_placeholder", quantity: 1 }]);
    expect(params.customer).toBe("cus_test_placeholder");
  });

  it("tags both the Checkout Session and the subscription with the campaign", async () => {
    await redirectTarget(() => createCheckoutSessionAction());

    const params = checkoutParams();
    expect(params.metadata).toEqual(STICKER_METADATA);
    expect(params.subscription_data).toEqual({ metadata: STICKER_METADATA });
  });

  it("uses the configured code even if a different ?promo= code is passed in", async () => {
    await redirectTarget(() => createCheckoutSessionAction("SOMETHINGELSE"));

    expect(mocks.stripe.promotionCodes.list).toHaveBeenCalledTimes(1);
    expect(mocks.stripe.promotionCodes.list).toHaveBeenCalledWith(
      expect.objectContaining({ code: "FREEMONTH" }),
    );
    expect(checkoutParams().metadata).toEqual(STICKER_METADATA);
  });
});

describe("sticker checkout fails safe — never a full-price session", () => {
  beforeEach(async () => {
    await signIn();
    arriveViaSticker();
  });

  async function expectStoppedBeforeStripeCheckout(reason: string) {
    const target = await redirectTarget(() => createCheckoutSessionAction());
    expect(target).toBe(`/subscribe?error=${reason}`);
    expect(mocks.stripe.checkout.sessions.create).not.toHaveBeenCalled();
    expect(mocks.getOrCreateStripeCustomer).not.toHaveBeenCalled();
  }

  it("stops when STRIPE_PROMO_CODE is not configured", async () => {
    vi.stubEnv("STRIPE_PROMO_CODE", "");
    await expectStoppedBeforeStripeCheckout("promo_unavailable");
    expect(mocks.stripe.promotionCodes.list).not.toHaveBeenCalled();
  });

  it("stops when no active promotion code matches", async () => {
    mocks.stripe.promotionCodes.list.mockResolvedValue({ data: [] });
    await expectStoppedBeforeStripeCheckout("promo_unavailable");
  });

  it("stops when the matched code is inactive", async () => {
    mocks.stripe.promotionCodes.list.mockResolvedValue({
      data: [{ ...ACTIVE_PROMOTION_CODE, active: false }],
    });
    await expectStoppedBeforeStripeCheckout("promo_unavailable");
  });

  it("stops when the matched code has expired", async () => {
    mocks.stripe.promotionCodes.list.mockResolvedValue({
      data: [{ ...ACTIVE_PROMOTION_CODE, expires_at: Math.floor(Date.now() / 1000) - 60 }],
    });
    await expectStoppedBeforeStripeCheckout("promo_unavailable");
  });

  it("stops when the matched code is fully redeemed", async () => {
    mocks.stripe.promotionCodes.list.mockResolvedValue({
      data: [{ ...ACTIVE_PROMOTION_CODE, max_redemptions: 100, times_redeemed: 100 }],
    });
    await expectStoppedBeforeStripeCheckout("promo_unavailable");
  });

  it("stops when the promotion code can't be retrieved, without logging Stripe's message", async () => {
    mocks.stripe.promotionCodes.list.mockRejectedValue(
      Object.assign(new Error("Invalid API Key provided: sk_test_********leak"), {
        type: "StripeAuthenticationError",
      }),
    );
    await expectStoppedBeforeStripeCheckout("promo_unavailable");

    const logged = vi.mocked(console.error).mock.calls.flat().join(" ");
    expect(logged).toContain("StripeAuthenticationError");
    expect(logged).not.toContain("sk_test");
  });

  it("stops (no retry without the discount) when Stripe rejects the discounted session", async () => {
    mocks.stripe.checkout.sessions.create.mockRejectedValue(
      Object.assign(new Error("This promotion code cannot be redeemed by this customer."), {
        type: "StripeInvalidRequestError",
        code: "promotion_code_customer_not_eligible",
      }),
    );

    const target = await redirectTarget(() => createCheckoutSessionAction());

    expect(target).toBe("/subscribe?error=promo_rejected");
    // Exactly one attempt, and it carried the discount — no silent full-price fallback.
    expect(checkoutParams().discounts).toEqual([{ promotion_code: "promo_sticker_placeholder" }]);
  });
});

describe("normal checkout (no sticker campaign) is unchanged", () => {
  beforeEach(async () => {
    await signIn();
  });

  it("gets no automatic discount or campaign metadata, even with STRIPE_PROMO_CODE set", async () => {
    const target = await redirectTarget(() => createCheckoutSessionAction());

    expect(target).toBe(CHECKOUT_URL);
    expect(mocks.stripe.promotionCodes.list).not.toHaveBeenCalled();
    const params = checkoutParams();
    expect(params).not.toHaveProperty("discounts");
    expect(params.allow_promotion_codes).toBe(true);
    expect(params.metadata).toEqual({ userId: USER_ID });
    expect(params.subscription_data).toEqual({ metadata: { userId: USER_ID } });
  });

  it("ignores an unrecognized campaign cookie value", async () => {
    mocks.jar.set("fr_campaign", "promo2");
    await redirectTarget(() => createCheckoutSessionAction());

    const params = checkoutParams();
    expect(params).not.toHaveProperty("discounts");
    expect(params.metadata).toEqual({ userId: USER_ID });
  });

  it("keeps the existing ?promo= behavior: applies a found code, no campaign metadata", async () => {
    await redirectTarget(() => createCheckoutSessionAction("SUMMER"));

    expect(mocks.stripe.promotionCodes.list).toHaveBeenCalledWith({
      code: "SUMMER",
      active: true,
      limit: 1,
    });
    const params = checkoutParams();
    expect(params.discounts).toEqual([{ promotion_code: "promo_sticker_placeholder" }]);
    expect(params.metadata).toEqual({ userId: USER_ID });
  });
});

describe("dismissing the sticker offer", () => {
  it("clears the campaign cookie only on explicit request", async () => {
    await signIn();
    arriveViaSticker();

    const target = await redirectTarget(() => dismissStickerOfferAction());

    expect(target).toBe("/subscribe");
    expect(mocks.cookieStore.delete).toHaveBeenCalledWith({ name: "fr_campaign", path: "/" });
    expect(mocks.jar.has("fr_campaign")).toBe(false);
  });
});

describe("unauthenticated callers are rejected by verifySession()", () => {
  beforeEach(() => {
    arriveViaSticker();
  });

  it.each([
    ["createCheckoutSessionAction", () => createCheckoutSessionAction()],
    ["createBillingPortalSessionAction", () => createBillingPortalSessionAction()],
    ["dismissStickerOfferAction", () => dismissStickerOfferAction()],
  ])("%s redirects to /login without touching Stripe", async (_name, run) => {
    const target = await redirectTarget(run);

    expect(target).toBe("/login");
    expect(mocks.stripe.promotionCodes.list).not.toHaveBeenCalled();
    expect(mocks.stripe.checkout.sessions.create).not.toHaveBeenCalled();
    expect(mocks.stripe.checkout.sessions.list).not.toHaveBeenCalled();
    expect(mocks.stripe.subscriptions.list).not.toHaveBeenCalled();
    expect(mocks.stripe.billingPortal.sessions.create).not.toHaveBeenCalled();
    expect(mocks.getOrCreateStripeCustomer).not.toHaveBeenCalled();
    expect(mocks.jar.get("fr_campaign")).toBe("promo1");
  });

  it("rejects a forged session cookie", async () => {
    mocks.jar.set("session", "forged.token.value");
    expect(await redirectTarget(() => createCheckoutSessionAction())).toBe("/login");
    expect(mocks.stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });
});

describe("double-subscribe guard (asks Stripe, not the webhook-fed table)", () => {
  beforeEach(async () => {
    await signIn();
  });

  it.each([["normal"], ["sticker"]])(
    "sends an already-subscribed customer to billing instead of a new checkout (%s)",
    async (path) => {
      if (path === "sticker") arriveViaSticker();
      mocks.stripe.subscriptions.list.mockResolvedValue({
        data: [{ id: "sub_existing_placeholder", status: "active" }],
      });

      const target = await redirectTarget(() => createCheckoutSessionAction());

      expect(target).toBe("/settings/billing?notice=already_subscribed");
      expect(mocks.stripe.subscriptions.list).toHaveBeenCalledWith({
        customer: "cus_test_placeholder",
        status: "all",
        limit: 100,
      });
      expect(mocks.stripe.checkout.sessions.create).not.toHaveBeenCalled();
    },
  );

  it.each(["trialing", "past_due", "unpaid", "paused"])(
    "also blocks a %s subscription",
    async (status) => {
      mocks.stripe.subscriptions.list.mockResolvedValue({ data: [{ id: "sub_x", status }] });
      expect(await redirectTarget(() => createCheckoutSessionAction())).toBe(
        "/settings/billing?notice=already_subscribed",
      );
      expect(mocks.stripe.checkout.sessions.create).not.toHaveBeenCalled();
    },
  );

  it("lets a customer whose past subscriptions are canceled or expired subscribe again", async () => {
    mocks.stripe.subscriptions.list.mockResolvedValue({
      data: [
        { id: "sub_old", status: "canceled" },
        { id: "sub_failed", status: "incomplete_expired" },
      ],
    });
    expect(await redirectTarget(() => createCheckoutSessionAction())).toBe(CHECKOUT_URL);
  });

  it("expires the customer's other open Checkout Sessions before creating a new one", async () => {
    mocks.stripe.checkout.sessions.list.mockResolvedValue({
      data: [{ id: "cs_open_tab_1" }, { id: "cs_open_tab_2" }],
    });

    await redirectTarget(() => createCheckoutSessionAction());

    expect(mocks.stripe.checkout.sessions.list).toHaveBeenCalledWith({
      customer: "cus_test_placeholder",
      status: "open",
      limit: 100,
    });
    expect(mocks.stripe.checkout.sessions.expire).toHaveBeenCalledWith("cs_open_tab_1");
    expect(mocks.stripe.checkout.sessions.expire).toHaveBeenCalledWith("cs_open_tab_2");
    const expireOrder = mocks.stripe.checkout.sessions.expire.mock.invocationCallOrder[0];
    const createOrder = mocks.stripe.checkout.sessions.create.mock.invocationCallOrder[0];
    expect(expireOrder).toBeLessThan(createOrder);
  });

  it.each([
    ["the subscription lookup fails", "subscriptions"],
    ["an open session can't be expired", "expire"],
  ])("fails closed when %s", async (_label, failing) => {
    mocks.stripe.checkout.sessions.list.mockResolvedValue({ data: [{ id: "cs_open" }] });
    const outage = Object.assign(new Error("connection reset"), { type: "StripeConnectionError" });
    if (failing === "subscriptions") mocks.stripe.subscriptions.list.mockRejectedValue(outage);
    else mocks.stripe.checkout.sessions.expire.mockRejectedValue(outage);

    expect(await redirectTarget(() => createCheckoutSessionAction())).toBe(
      "/subscribe?error=billing_unavailable",
    );
    expect(mocks.stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });
});
