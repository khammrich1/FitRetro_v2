import { afterEach, describe, expect, it, vi } from "vitest";
import { getAppUrl } from "./app-url";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getAppUrl", () => {
  it("uses the configured APP_URL, without a trailing slash", () => {
    vi.stubEnv("APP_URL", "https://staging.fitretro.app/");
    expect(getAppUrl()).toBe("https://staging.fitretro.app");
  });

  it("defaults to the production domain in production", () => {
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(getAppUrl()).toBe("https://fitretro.app");
  });

  it("defaults to localhost in development", () => {
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(getAppUrl()).toBe("http://localhost:3000");
  });
});
