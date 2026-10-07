import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: mocks.create };
  },
}));
import { generateDailyReading } from "./generate";
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
});
describe("daily reader diagnostics", () => {
  it("records completion metadata before malformed output parsing fails, without logging text", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    mocks.create.mockResolvedValue(response("secret article fragment", "max_tokens"));
    await expect(generateDailyReading("leadership")).rejects.toThrow("structured output");
    expect(info).toHaveBeenCalledWith(
      "daily_reading_generation",
      expect.objectContaining({ stopReason: "max_tokens", outputTokens: 3000, maxTokens: 3000 }),
    );
    expect(JSON.stringify(info.mock.calls)).not.toContain("secret article fragment");
    info.mockRestore();
  });
  it("keeps valid output and existing token budget unchanged, logging only content shape", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    mocks.create.mockResolvedValue(
      response(JSON.stringify({ title: "Title", body: "A private article ending." })),
    );
    expect(await generateDailyReading("leadership")).toEqual({
      title: "Title",
      body: "A private article ending.",
      readMinutes: 1,
    });
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(mocks.create.mock.calls[0][0].max_tokens).toBe(3000);
    expect(info).toHaveBeenCalledWith(
      "daily_reading_content_shape",
      expect.objectContaining({ endsWithSentencePunctuation: true }),
    );
    expect(JSON.stringify(info.mock.calls)).not.toContain("private article");
    info.mockRestore();
  });
});
