// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const { GET } = await import("./route");

const TEST_SESSION_SECRET = "test-session-secret-not-a-real-credential";

async function sessionToken(userId: string) {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(TEST_SESSION_SECRET));
}

function visit(cookie?: string) {
  return GET(
    new NextRequest("https://fitretro.app/promo1", {
      headers: cookie ? { cookie } : undefined,
    }),
  );
}

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", TEST_SESSION_SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /promo1", () => {
  it("sends a logged-out visitor to signup, returning to /subscribe afterward", async () => {
    const response = await visit();

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.origin).toBe("https://fitretro.app");
    expect(location.pathname).toBe("/signup");
    expect(location.searchParams.get("next")).toBe("/subscribe");
  });

  it("sends a logged-in visitor straight to /subscribe", async () => {
    const response = await visit(`session=${await sessionToken("user-123")}`);

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/subscribe");
  });

  it("treats a forged/invalid session cookie as logged out", async () => {
    const response = await visit("session=not-a-valid-jwt");
    expect(new URL(response.headers.get("location")!).pathname).toBe("/signup");
  });

  it.each([
    ["logged out", undefined],
    ["logged in", "user-123"],
  ])("records campaign promo1 in a first-party cookie (%s)", async (_label, userId) => {
    const response = await visit(userId ? `session=${await sessionToken(userId)}` : undefined);

    const cookie = response.cookies.get("fr_campaign");
    expect(cookie?.value).toBe("promo1");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
    expect(cookie?.path).toBe("/");
    expect(cookie?.maxAge).toBe(30 * 24 * 60 * 60);
  });

  it("marks the campaign cookie Secure in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = await visit();

    expect(response.cookies.get("fr_campaign")?.secure).toBe(true);
    expect(response.headers.get("set-cookie")).toMatch(/;\s*Secure/i);
  });

  it("is never cached, since the redirect depends on the visitor's session", async () => {
    const response = await visit();
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
