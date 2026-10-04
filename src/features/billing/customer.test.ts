// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUserById: vi.fn(),
  setIfUnset: vi.fn(),
  customersCreate: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/stripe", () => ({
  getStripeClient: () => ({ customers: { create: mocks.customersCreate } }),
}));
vi.mock("@/features/auth", () => ({
  getUserById: mocks.getUserById,
  setUserStripeCustomerIdIfUnset: mocks.setIfUnset,
}));

const { getOrCreateStripeCustomer } = await import("./customer");

const USER = { id: "user-1", email: "m@example.com", displayName: "M", stripeCustomerId: null };

beforeEach(() => {
  mocks.getUserById.mockReset().mockResolvedValue(USER);
  mocks.setIfUnset.mockReset().mockImplementation(async (_id: string, cus: string) => cus);
  mocks.customersCreate.mockReset().mockResolvedValue({ id: "cus_new" });
});

describe("getOrCreateStripeCustomer", () => {
  it("returns the stored customer without calling Stripe", async () => {
    mocks.getUserById.mockResolvedValue({ ...USER, stripeCustomerId: "cus_existing" });
    expect(await getOrCreateStripeCustomer("user-1")).toBe("cus_existing");
    expect(mocks.customersCreate).not.toHaveBeenCalled();
  });

  it("creates with an idempotency key derived from the user, so a retry can't make a second customer", async () => {
    expect(await getOrCreateStripeCustomer("user-1")).toBe("cus_new");
    expect(mocks.customersCreate).toHaveBeenCalledWith(
      { email: "m@example.com", name: "M", metadata: { userId: "user-1" } },
      { idempotencyKey: "customer-create:user-1" },
    );
    expect(mocks.setIfUnset).toHaveBeenCalledWith("user-1", "cus_new");
  });

  it("adopts the customer another request stored first instead of overwriting it", async () => {
    mocks.setIfUnset.mockResolvedValue("cus_won_the_race");
    expect(await getOrCreateStripeCustomer("user-1")).toBe("cus_won_the_race");
  });

  it("two concurrent first-time calls end up on one customer", async () => {
    // Stripe honours the idempotency key: both creates return the same customer.
    mocks.customersCreate.mockResolvedValue({ id: "cus_same" });
    let stored: string | null = null;
    mocks.setIfUnset.mockImplementation(async (_id: string, cus: string) => {
      stored ??= cus;
      return stored;
    });
    const [a, b] = await Promise.all([
      getOrCreateStripeCustomer("user-1"),
      getOrCreateStripeCustomer("user-1"),
    ]);
    expect(a).toBe("cus_same");
    expect(b).toBe("cus_same");
  });
});
