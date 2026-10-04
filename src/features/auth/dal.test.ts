// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";

const mocks = vi.hoisted(() => ({
  jar: new Map<string, string>(),
  getSessionVersion: vi.fn<(userId: string) => Promise<number | null>>(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      mocks.jar.has(name) ? { name, value: mocks.jar.get(name)! } : undefined,
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("./session-check", () => ({ getSessionVersion: mocks.getSessionVersion }));
vi.mock("./queries", () => ({ getUserById: async (id: string) => ({ id, email: "a@b.c" }) }));

const { getSessionUserId, verifySession, getCurrentUser } = await import("./dal");

const SECRET = "test-session-secret-not-a-real-credential";
const USER_ID = "7a1c3f8e-0000-4000-8000-000000000001";

async function setCookie(payload: Record<string, unknown>, secret = SECRET) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(secret));
  mocks.jar.set("session", token);
}

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", SECRET);
  mocks.jar.clear();
  mocks.getSessionVersion.mockReset();
});

describe("getSessionUserId", () => {
  it("accepts a cookie whose version matches the account's", async () => {
    await setCookie({ userId: USER_ID, sv: 3 });
    mocks.getSessionVersion.mockResolvedValue(3);
    expect(await getSessionUserId()).toBe(USER_ID);
    expect(mocks.getSessionVersion).toHaveBeenCalledWith(USER_ID);
  });

  it("rejects a cookie issued before the account's sessions were revoked", async () => {
    await setCookie({ userId: USER_ID, sv: 2 });
    mocks.getSessionVersion.mockResolvedValue(3);
    expect(await getSessionUserId()).toBeNull();
  });

  it("treats a pre-versioning cookie as version 1 — valid until the first revocation", async () => {
    await setCookie({ userId: USER_ID });
    mocks.getSessionVersion.mockResolvedValue(1);
    expect(await getSessionUserId()).toBe(USER_ID);
    mocks.getSessionVersion.mockResolvedValue(2);
    expect(await getSessionUserId()).toBeNull();
  });

  it("rejects a cookie for an account that no longer exists", async () => {
    await setCookie({ userId: USER_ID, sv: 1 });
    mocks.getSessionVersion.mockResolvedValue(null);
    expect(await getSessionUserId()).toBeNull();
  });

  it("rejects a forged or missing cookie without touching the database", async () => {
    await setCookie({ userId: USER_ID, sv: 1 }, "some-other-secret");
    expect(await getSessionUserId()).toBeNull();
    mocks.jar.clear();
    expect(await getSessionUserId()).toBeNull();
    expect(mocks.getSessionVersion).not.toHaveBeenCalled();
  });
});

describe("verifySession / getCurrentUser", () => {
  it("send a revoked cookie to be cleared / return null once sessions are revoked", async () => {
    await setCookie({ userId: USER_ID, sv: 1 });
    mocks.getSessionVersion.mockResolvedValue(2);
    // Not straight to /login: the dead cookie must be deleted first or the proxy loops.
    await expect(verifySession()).rejects.toThrow("NEXT_REDIRECT /session/expired");
    expect(await getCurrentUser()).toBeNull();
  });

  it("sends a request with no cookie straight to login", async () => {
    await expect(verifySession()).rejects.toThrow("NEXT_REDIRECT /login");
  });

  it("work normally for a current session", async () => {
    await setCookie({ userId: USER_ID, sv: 1 });
    mocks.getSessionVersion.mockResolvedValue(1);
    expect(await verifySession()).toEqual({ userId: USER_ID });
    expect(await getCurrentUser()).toMatchObject({ id: USER_ID });
  });
});
