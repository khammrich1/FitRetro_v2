import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-redirect";

describe("safeNextPath", () => {
  it("accepts same-origin relative paths", () => {
    expect(safeNextPath("/subscribe")).toBe("/subscribe");
    expect(safeNextPath("/today?date=2026-09-23")).toBe("/today?date=2026-09-23");
  });

  it.each([
    ["absolute URL", "https://evil.example/subscribe"],
    ["protocol-relative URL", "//evil.example/subscribe"],
    ["backslash host trick", "/\\evil.example"],
    ["javascript: URL", "javascript:alert(1)"],
    ["relative path without leading slash", "subscribe"],
    ["tab-smuggled protocol-relative URL", "/\t/evil.example"],
    ["empty string", ""],
  ])("rejects %s", (_label, value) => {
    expect(safeNextPath(value)).toBeNull();
  });

  it("rejects non-string input (missing field, repeated query param)", () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath(["/subscribe", "/today"])).toBeNull();
  });
});
