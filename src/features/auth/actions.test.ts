// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";

const mocks = vi.hoisted(() => {
  class RedirectError extends Error {
    constructor(public readonly url: string) {
      super(`NEXT_REDIRECT ${url}`);
    }
  }
  const jar = new Map<string, string>();
  const cookieStore = {
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: vi.fn((name: string, value: string) => {
      jar.set(name, value);
    }),
    delete: vi.fn((arg: string | { name: string }) => {
      jar.delete(typeof arg === "string" ? arg : arg.name);
    }),
  };
  return {
    RedirectError,
    jar,
    cookieStore,
    getUserByEmail: vi.fn(),
    createUser: vi.fn(),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => mocks.cookieStore }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new mocks.RedirectError(url);
  },
}));
vi.mock("@/features/auth/queries", () => ({
  getUserByEmail: mocks.getUserByEmail,
  createUser: mocks.createUser,
}));

const { login, signup } = await import("./actions");

async function redirectTarget(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (error) {
    if (error instanceof mocks.RedirectError) return error.url;
    throw error;
  }
  throw new Error("Expected the action to redirect.");
}

function form(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

const PASSWORD = "password123";

beforeEach(async () => {
  vi.stubEnv("SESSION_SECRET", "test-session-secret-not-a-real-credential");
  mocks.jar.clear();
  mocks.cookieStore.set.mockClear();
  mocks.cookieStore.delete.mockClear();
  mocks.getUserByEmail.mockReset();
  mocks.createUser.mockReset();
  // Arrived via /promo1 before signing up/logging in.
  mocks.jar.set("fr_campaign", "promo1");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("login", () => {
  beforeEach(async () => {
    mocks.getUserByEmail.mockResolvedValue({
      id: "user-1",
      passwordHash: await bcrypt.hash(PASSWORD, 4),
    });
  });

  it("returns to the validated next destination with campaign attribution intact", async () => {
    const target = await redirectTarget(() =>
      login(undefined, form({ email: "a@example.com", password: PASSWORD, next: "/subscribe" })),
    );

    expect(target).toBe("/subscribe");
    expect(mocks.jar.get("fr_campaign")).toBe("promo1");
    expect(mocks.jar.has("session")).toBe(true);
    expect(mocks.cookieStore.delete).not.toHaveBeenCalled();
    expect(mocks.cookieStore.set.mock.calls.map(([name]) => name)).toEqual(["session"]);
  });

  it("still defaults to /today without a next destination", async () => {
    const target = await redirectTarget(() =>
      login(undefined, form({ email: "a@example.com", password: PASSWORD })),
    );
    expect(target).toBe("/today");
  });

  it.each(["https://evil.example/subscribe", "//evil.example/subscribe", "/\\evil.example"])(
    "ignores an off-site next destination (%s)",
    async (next) => {
      const target = await redirectTarget(() =>
        login(undefined, form({ email: "a@example.com", password: PASSWORD, next })),
      );
      expect(target).toBe("/today");
    },
  );

  it("keeps the campaign cookie when the password is wrong", async () => {
    const result = await login(
      undefined,
      form({ email: "a@example.com", password: "wrong-password1", next: "/subscribe" }),
    );
    expect(result).toEqual({ message: "Invalid email or password." });
    expect(mocks.jar.get("fr_campaign")).toBe("promo1");
  });
});

describe("signup", () => {
  beforeEach(() => {
    mocks.getUserByEmail.mockResolvedValue(null);
    mocks.createUser.mockResolvedValue({ id: "user-2" });
  });

  it("returns to the validated next destination with campaign attribution intact", async () => {
    const target = await redirectTarget(() =>
      signup(
        undefined,
        form({
          displayName: "Sticker Scanner",
          email: "new@example.com",
          password: PASSWORD,
          next: "/subscribe",
        }),
      ),
    );

    expect(target).toBe("/subscribe");
    expect(mocks.jar.get("fr_campaign")).toBe("promo1");
    expect(mocks.cookieStore.delete).not.toHaveBeenCalled();
    expect(mocks.cookieStore.set.mock.calls.map(([name]) => name)).toEqual(["session"]);
  });

  it("tags the new account with the sticker campaign it arrived from", async () => {
    await redirectTarget(() =>
      signup(
        undefined,
        form({ displayName: "Sticker Scanner", email: "new@example.com", password: PASSWORD }),
      ),
    );
    expect(mocks.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: "new@example.com", signupCampaign: "promo1" }),
    );
  });

  it.each([
    ["no campaign cookie", undefined],
    ["an unrecognized campaign value", "promo9"],
  ])("leaves signupCampaign null with %s", async (_label, cookieValue) => {
    mocks.jar.delete("fr_campaign");
    if (cookieValue) mocks.jar.set("fr_campaign", cookieValue);
    await redirectTarget(() =>
      signup(
        undefined,
        form({ displayName: "Walk In", email: "walkin@example.com", password: PASSWORD }),
      ),
    );
    expect(mocks.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ signupCampaign: null }),
    );
  });

  it("ignores an off-site next destination", async () => {
    const target = await redirectTarget(() =>
      signup(
        undefined,
        form({
          displayName: "Sticker Scanner",
          email: "new@example.com",
          password: PASSWORD,
          next: "https://evil.example",
        }),
      ),
    );
    expect(target).toBe("/today");
  });
});
