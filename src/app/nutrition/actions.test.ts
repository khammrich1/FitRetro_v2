// @vitest-environment node
//
// Issue #56: an admission (usage counter) failure or a provider failure must come back as an
// inline, retryable message — never escape the action as a full-page error — while a
// verifySession redirect must still escape, untouched.
import Anthropic from "@anthropic-ai/sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class RedirectError extends Error {
    constructor(public readonly url: string) {
      super(`NEXT_REDIRECT ${url}`);
    }
  }
  return {
    RedirectError,
    verifySession: vi.fn(),
    getUserById: vi.fn(),
    reserveAiUsage: vi.fn(),
    getAiUsageTotalForDay: vi.fn(),
    getRemainingMacrosForDay: vi.fn(),
    suggestFoodsForRemainingMacros: vi.fn(),
    estimateMacrosFromDescription: vi.fn(),
    estimateMacrosFromImage: vi.fn(),
    generateRecipe: vi.fn(),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/auth", () => ({
  verifySession: mocks.verifySession,
  getUserById: mocks.getUserById,
  isOwner: (email: string) => email === "owner@example.com",
  parseMemberDay: async () => new Date("2026-10-08T12:00:00"),
  setUserMacroOrder: vi.fn(),
  setUserBodyStats: vi.fn(),
}));
// The real admission logic runs; only its two database calls are faked.
vi.mock("@/features/ai-usage/queries", () => ({
  reserveAiUsage: mocks.reserveAiUsage,
  getAiUsageTotalForDay: mocks.getAiUsageTotalForDay,
}));
vi.mock("@/features/nutrition", () => ({
  getRemainingMacrosForDay: mocks.getRemainingMacrosForDay,
  suggestFoodsForRemainingMacros: mocks.suggestFoodsForRemainingMacros,
  estimateMacrosFromDescription: mocks.estimateMacrosFromDescription,
  estimateMacrosFromImage: mocks.estimateMacrosFromImage,
  getGoals: async () => null,
  SUPPORTED_IMAGE_MEDIA_TYPES: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  ESTIMATE_PURPOSES: ["meal", "batch"],
}));
vi.mock("@/features/pantry", () => ({
  listPantryItems: async () => [],
  getPantryItemById: vi.fn(),
}));
vi.mock("@/features/recipes", () => ({ generateRecipe: mocks.generateRecipe }));
vi.mock("@/features/measurements", () => ({ recordMeasurement: vi.fn() }));

const actions = await import("./actions");

/** What Postgres raises through the driver for the old owner sentinel: SQLSTATE 22003. */
function pgOutOfRange() {
  const error = new Error(
    'value "9007199254740991" is out of range for type integer — insert into "ai_usage" ...',
  );
  (error as Error & { code: string }).code = "22003";
  return error;
}

/** Every action's state is a success-or-error union; this reads the error side. */
const errorOf = (result: unknown) => (result as { error?: string } | undefined)?.error;

function apiError(status: number, message: string) {
  return new Anthropic.APIError(status, { type: "error", error: { message } }, message, undefined);
}

beforeEach(() => {
  mocks.verifySession.mockReset().mockResolvedValue({ userId: "owner-1" });
  mocks.getUserById
    .mockReset()
    .mockResolvedValue({ id: "owner-1", email: "owner@example.com", timezone: null });
  mocks.reserveAiUsage.mockReset().mockResolvedValue(1);
  mocks.getAiUsageTotalForDay.mockReset().mockResolvedValue(0);
  mocks.getRemainingMacrosForDay
    .mockReset()
    .mockResolvedValue({ calories: 500, proteinGrams: 40, carbsGrams: 50, fatGrams: 15 });
  mocks.suggestFoodsForRemainingMacros.mockReset().mockResolvedValue([]);
  mocks.estimateMacrosFromDescription.mockReset();
  mocks.estimateMacrosFromImage.mockReset();
  mocks.generateRecipe.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("owner admission", () => {
  it("reserves with no per-user limit for the owner — never a sentinel number", async () => {
    await actions.estimateMacrosAction("2 eggs");
    expect(mocks.reserveAiUsage).toHaveBeenCalledWith("owner-1", expect.any(Date), null);
    expect(mocks.estimateMacrosFromDescription).toHaveBeenCalled();
  });

  it("keeps the normal cap for a member", async () => {
    mocks.verifySession.mockResolvedValue({ userId: "m1" });
    mocks.getUserById.mockResolvedValue({ id: "m1", email: "member@example.com", timezone: null });
    await actions.estimateMacrosAction("2 eggs");
    expect(mocks.reserveAiUsage).toHaveBeenCalledWith("m1", expect.any(Date), 20);
  });
});

describe("admission failure is contained in every nutrition AI action", () => {
  const cases: [string, () => Promise<unknown>][] = [
    ["suggestions", () => actions.getSuggestionsAction("2026-10-08", "something light")],
    ["text estimate", () => actions.estimateMacrosAction("2 eggs")],
    [
      "photo estimate",
      () => {
        const form = new FormData();
        form.set("image", new File([new Uint8Array(16)], "meal.jpg", { type: "image/jpeg" }));
        return actions.estimateMacrosFromImageAction(form);
      },
    ],
    [
      "recipe",
      () =>
        actions.getRecipeAction("Omelette", "eggs", {
          calories: 300,
          proteinGrams: 20,
          carbsGrams: 2,
          fatGrams: 22,
        }),
    ],
  ];

  for (const [label, run] of cases) {
    it(`${label}: a database error in the usage counter becomes an inline message without SQL`, async () => {
      mocks.reserveAiUsage.mockRejectedValue(pgOutOfRange());
      const result = await run();
      expect(result).toBeDefined();
      expect(errorOf(result)).toMatch(/aren't available right now/);
      expect(errorOf(result)).not.toMatch(/ai_usage|out of range|insert into|9007199254740991/);
      // No paid call is made for an action that couldn't be counted.
      expect(mocks.estimateMacrosFromDescription).not.toHaveBeenCalled();
      expect(mocks.suggestFoodsForRemainingMacros).not.toHaveBeenCalled();
      expect(mocks.estimateMacrosFromImage).not.toHaveBeenCalled();
      expect(mocks.generateRecipe).not.toHaveBeenCalled();
    });
  }

  it("a failing site-wide total read is contained the same way", async () => {
    mocks.getAiUsageTotalForDay.mockRejectedValue(new Error("connection refused"));
    const result = await actions.estimateMacrosAction("2 eggs");
    expect(errorOf(result)).toMatch(/aren't available right now/);
    expect(mocks.reserveAiUsage).not.toHaveBeenCalled();
  });
});

describe("provider failure is an honest inline message", () => {
  it("out of credit", async () => {
    mocks.estimateMacrosFromDescription.mockRejectedValue(
      apiError(400, "Your credit balance is too low to access the Anthropic API."),
    );
    const result = await actions.estimateMacrosAction("2 eggs");
    expect(errorOf(result)).toMatch(/out of credit/);
  });

  it("bad key", async () => {
    mocks.suggestFoodsForRemainingMacros.mockRejectedValue(apiError(401, "invalid x-api-key"));
    const result = await actions.getSuggestionsAction("2026-10-08");
    expect(errorOf(result)).toMatch(/credentials/);
  });

  it("busy or down", async () => {
    mocks.generateRecipe.mockRejectedValue(apiError(529, "Overloaded"));
    const result = await actions.getRecipeAction("A", "b", {
      calories: 1,
      proteinGrams: 1,
      carbsGrams: 1,
      fatGrams: 1,
    });
    expect(errorOf(result)).toMatch(/isn't responding/);
  });

  it("the app's own configuration message still passes through", async () => {
    mocks.estimateMacrosFromDescription.mockRejectedValue(
      new Error("ANTHROPIC_API_KEY is not configured. Set it in .env to enable macro estimation."),
    );
    const result = await actions.estimateMacrosAction("2 eggs");
    expect(errorOf(result)).toMatch(/ANTHROPIC_API_KEY is not configured/);
  });

  it("an unknown internal error never leaks its text", async () => {
    mocks.estimateMacrosFromDescription.mockRejectedValue(
      new Error("relation nutrition_entries does not exist"),
    );
    const result = await actions.estimateMacrosAction("2 eggs");
    expect(errorOf(result)).toMatch(/aren't available right now/);
    expect(errorOf(result)).not.toMatch(/relation/);
  });
});

describe("the auth boundary is untouched", () => {
  it("a verifySession redirect still escapes the action", async () => {
    mocks.verifySession.mockRejectedValue(new mocks.RedirectError("/login"));
    await expect(actions.estimateMacrosAction("2 eggs")).rejects.toBeInstanceOf(
      mocks.RedirectError,
    );
    expect(mocks.reserveAiUsage).not.toHaveBeenCalled();
  });
});
