import { afterEach, describe, expect, it, vi } from "vitest";
import { campaignCookieOptions, parseCampaign } from "./campaign";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("parseCampaign", () => {
  it("recognizes only the sticker campaign", () => {
    expect(parseCampaign("promo1")).toBe("promo1");
    expect(parseCampaign("promo2")).toBeNull();
    expect(parseCampaign("PROMO1")).toBeNull();
    expect(parseCampaign("")).toBeNull();
    expect(parseCampaign(undefined)).toBeNull();
  });
});

describe("campaignCookieOptions", () => {
  it("is httpOnly, lax, site-wide and lasts about 30 days", () => {
    const options = campaignCookieOptions();
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
    expect(options.maxAge).toBe(30 * 24 * 60 * 60);
  });

  it("is Secure in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(campaignCookieOptions().secure).toBe(true);
  });

  it("is not Secure in development, where localhost is plain HTTP", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(campaignCookieOptions().secure).toBe(false);
  });
});
