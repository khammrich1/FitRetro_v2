// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { batchDescriptionPrompt, batchImagePrompt } = await import("./macro-estimation");

describe("meal-prep batch prompts", () => {
  it("typed ingredients: full amounts, never scaled to a serving, raw by default", () => {
    const prompt = batchDescriptionPrompt("40g green beans, 14 egg whites");
    expect(prompt).toContain('Ingredients: "40g green beans, 14 egg whites"');
    expect(prompt).toContain("Never scale anything down to a single serving");
    expect(prompt).toContain("assume raw/uncooked");
    expect(prompt).toContain("List every ingredient separately");
  });

  it("photo: reads the kitchen scale display and assumes it was tared", () => {
    const prompt = batchImagePrompt();
    expect(prompt).toContain("read the weight from the scale's display");
    expect(prompt).toContain("Assume the scale was zeroed (tared)");
    expect(prompt).toContain('mark the quantity as estimated (e.g. "~300g (estimated)")');
  });

  it("photo: counts whole packages and full recipes, never one serving", () => {
    const prompt = batchImagePrompt();
    expect(prompt).toContain("assume the");
    expect(prompt).toContain("whole package goes into the batch");
    expect(prompt).toContain("total them for the");
    expect(prompt).toContain("Never scale anything down to a single serving");
  });

  it("photo: includes the user's note, which takes precedence", () => {
    const prompt = batchImagePrompt("only half the bag of rice");
    expect(prompt).toContain("The user's note takes precedence");
    expect(prompt).toContain('"only half the bag of rice"');
    expect(batchImagePrompt()).not.toContain("Note from the user");
  });
});
