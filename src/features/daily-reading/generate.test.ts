import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: mocks.create };
  },
}));
import { generateDailyReading, READING_MAX_TOKENS } from "./generate";
const body = "A complete practical sentence. ".repeat(200);
function response(text: string, stop_reason = "end_turn") {
  return {
    id: "message-test",
    model: "test-model",
    stop_reason,
    usage: { input_tokens: 100, output_tokens: 3000 },
    content: [{ type: "text", text }],
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("ANTHROPIC_API_KEY", "test-only");
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
describe("complete daily readings", () => {
  it.each(["max_tokens", "stop_sequence", "refusal", null])(
    "rejects non-complete stop reason %s even with valid JSON",
    async (reason) => {
      mocks.create.mockResolvedValue(
        response(JSON.stringify({ title: "Title", body }), reason as string),
      );
      await expect(generateDailyReading("leadership")).rejects.toThrow("did not finish");
    },
  );
  it.each([body + "Vague feedback like", body + "…", "Too short."])(
    "rejects unfinished or implausibly short content",
    async (incomplete) => {
      mocks.create.mockResolvedValue(
        response(JSON.stringify({ title: "Title", body: incomplete })),
      );
      await expect(generateDailyReading("leadership")).rejects.toThrow("article body");
    },
  );
  it("redacts malformed output while retaining safe diagnostics", async () => {
    mocks.create.mockResolvedValue(response("secret article fragment"));
    await expect(generateDailyReading("leadership")).rejects.toThrow("structured output");
    expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain(
      "secret article fragment",
    );
  });
  it("accepts a complete article with output headroom", async () => {
    mocks.create.mockResolvedValue(response(JSON.stringify({ title: "Title", body })));
    expect(await generateDailyReading("leadership")).toEqual({
      title: "Title",
      body,
      readMinutes: 4,
    });
    expect(mocks.create.mock.calls[0][0].max_tokens).toBe(READING_MAX_TOKENS);
    expect(READING_MAX_TOKENS).toBe(6000);
  });
});
