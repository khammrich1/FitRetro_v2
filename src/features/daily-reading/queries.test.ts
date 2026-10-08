import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  existing: vi.fn(),
  claim: vi.fn(),
  insert: vi.fn(),
  generate: vi.fn(),
  budget: vi.fn(),
  total: vi.fn(),
}));
vi.mock("@/db/client", () => ({
  db: {
    select: () => ({ from: () => ({ where: mocks.existing }) }),
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: () => ({ returning: mocks.claim }),
        onConflictDoNothing: mocks.insert,
      }),
    }),
  },
}));
vi.mock("@/features/auth/rate-limit", () => ({ consumeRateLimit: mocks.budget }));
vi.mock("@/features/ai-usage", () => ({
  getAiUsageTotalForDay: mocks.total,
  globalDailyAiLimit: () => 100,
}));
vi.mock("./generate", () => ({
  generateDailyReading: mocks.generate,
  IncompleteReadingError: class extends Error {},
}));
import { IncompleteReadingError } from "./generate";
import { generateAndCacheReading } from "./queries";
const complete = { title: "Complete", body: "Complete article.", readMinutes: 5 };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.existing.mockResolvedValue([]);
  mocks.claim.mockResolvedValue([{ id: "claim" }]);
  mocks.budget.mockResolvedValue({ allowed: true });
  mocks.total.mockResolvedValue(0);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
describe("reading persistence and bounded retry", () => {
  it("retries an incomplete response once and caches only the successful replacement", async () => {
    mocks.generate
      .mockRejectedValueOnce(new IncompleteReadingError())
      .mockResolvedValueOnce(complete);
    await generateAndCacheReading("2026-10-08", "leadership");
    expect(mocks.generate).toHaveBeenCalledTimes(2);
    expect(mocks.insert).toHaveBeenCalledOnce();
  });
  it("never caches two incomplete responses or adds a third attempt", async () => {
    mocks.generate.mockRejectedValue(new IncompleteReadingError());
    await generateAndCacheReading("2026-10-08", "leadership");
    expect(mocks.generate).toHaveBeenCalledTimes(2);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("does not retry credit/auth/provider errors", async () => {
    mocks.generate.mockRejectedValue(new Error("no credits"));
    await generateAndCacheReading("2026-10-08", "leadership");
    expect(mocks.generate).toHaveBeenCalledOnce();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("preserves existing cached articles without calling the API", async () => {
    mocks.existing.mockResolvedValue([{ id: "existing" }]);
    await generateAndCacheReading("2026-10-08", "leadership");
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("does not generate without the lease or after the persistent attempt budget is spent", async () => {
    mocks.claim.mockResolvedValueOnce([]);
    await generateAndCacheReading("2026-10-08", "leadership");
    mocks.budget.mockResolvedValue({ allowed: false });
    await generateAndCacheReading("2026-10-08", "leadership");
    expect(mocks.generate).not.toHaveBeenCalled();
  });
});
