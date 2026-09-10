import { describe, expect, it } from "vitest";
import { matchTrackedPath } from "./page-view-logger";

describe("matchTrackedPath", () => {
  it("matches the bare root only for '/'", () => {
    expect(matchTrackedPath("/")).toBe("/");
  });

  it("collapses sub-paths onto their tracked prefix", () => {
    expect(matchTrackedPath("/settings/nutrition")).toBe("/settings");
    expect(matchTrackedPath("/feedback/review")).toBe("/feedback");
    expect(matchTrackedPath("/today")).toBe("/today");
  });

  it("ignores query strings, since matching only ever sees the pathname", () => {
    expect(matchTrackedPath("/today")).toBe("/today");
  });

  it("returns null for untracked or static paths", () => {
    expect(matchTrackedPath("/routine")).toBeNull();
    expect(matchTrackedPath("/_next/static/chunk.js")).toBeNull();
    expect(matchTrackedPath("/api/whatever")).toBeNull();
  });

  it("does not treat a prefix as matching an unrelated path that merely starts with it", () => {
    expect(matchTrackedPath("/helper")).toBeNull();
  });
});
