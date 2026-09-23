import { describe, expect, it } from "vitest";
import { isTestModeSecretKey } from "./stripe-mode";

describe("isTestModeSecretKey", () => {
  it("accepts test-mode secret and restricted keys", () => {
    expect(isTestModeSecretKey("sk_test_placeholder")).toBe(true);
    expect(isTestModeSecretKey("rk_test_placeholder")).toBe(true);
  });

  it("rejects live-mode keys", () => {
    expect(isTestModeSecretKey("sk_live_placeholder")).toBe(false);
    expect(isTestModeSecretKey("rk_live_placeholder")).toBe(false);
  });

  it("rejects a publishable key pasted into the secret slot", () => {
    expect(isTestModeSecretKey("pk_test_placeholder")).toBe(false);
  });

  it("rejects an empty value", () => {
    expect(isTestModeSecretKey("")).toBe(false);
  });
});
