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
    createPasswordResetToken: vi.fn(),
    resetPasswordWithToken: vi.fn(),
    sendEmail: vi.fn(),
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
vi.mock("@/features/auth/password-reset", () => ({
  RESET_TOKEN_TTL_MINUTES: 60,
  createPasswordResetToken: mocks.createPasswordResetToken,
  resetPasswordWithToken: mocks.resetPasswordWithToken,
}));
vi.mock("@/lib/email", () => ({ sendEmail: mocks.sendEmail }));

const { login, signup, requestPasswordReset, resetPassword } = await import("./actions");

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
    expect(result).toEqual({
      message: "Invalid email or password.",
      // Echoed back so the form keeps the email; the password never is.
      fields: { email: "a@example.com" },
    });
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

describe("requestPasswordReset", () => {
  const GENERIC_REPLY = expect.stringContaining("If an account exists for that email");

  beforeEach(() => {
    vi.stubEnv("APP_URL", "https://fitretro.app");
    mocks.createPasswordResetToken.mockReset().mockResolvedValue("raw-one-time-token");
    mocks.sendEmail.mockReset().mockResolvedValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emails a one-time link built from APP_URL", async () => {
    mocks.getUserByEmail.mockResolvedValue({ id: "user-1", email: "member@example.com" });

    const result = await requestPasswordReset(undefined, form({ email: "Member@Example.com" }));

    expect(result).toEqual({ sent: true, message: GENERIC_REPLY });
    expect(mocks.getUserByEmail).toHaveBeenCalledWith("member@example.com");
    expect(mocks.createPasswordResetToken).toHaveBeenCalledWith("user-1");
    const email = mocks.sendEmail.mock.calls[0][0];
    expect(email.to).toBe("member@example.com");
    expect(email.text).toContain("https://fitretro.app/reset-password?token=raw-one-time-token");
    expect(email.html).toContain(
      'href="https://fitretro.app/reset-password?token=raw-one-time-token"',
    );
  });

  it("gives the identical reply for an unknown email and sends nothing", async () => {
    mocks.getUserByEmail.mockResolvedValue(null);

    const result = await requestPasswordReset(undefined, form({ email: "nobody@example.com" }));

    expect(result).toEqual({ sent: true, message: GENERIC_REPLY });
    expect(mocks.createPasswordResetToken).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("sends no second email inside the cooldown, with the same reply", async () => {
    mocks.getUserByEmail.mockResolvedValue({ id: "user-1", email: "member@example.com" });
    mocks.createPasswordResetToken.mockResolvedValue(null);

    const result = await requestPasswordReset(undefined, form({ email: "member@example.com" }));

    expect(result).toEqual({ sent: true, message: GENERIC_REPLY });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("hides an email failure from the requester and doesn't log the token", async () => {
    mocks.getUserByEmail.mockResolvedValue({ id: "user-1", email: "member@example.com" });
    mocks.sendEmail.mockRejectedValue(new Error("Email is not configured."));

    const result = await requestPasswordReset(undefined, form({ email: "member@example.com" }));

    expect(result).toEqual({ sent: true, message: GENERIC_REPLY });
    const logged = vi.mocked(console.error).mock.calls.flat().join(" ");
    expect(logged).toContain("Password reset email failed");
    expect(logged).not.toContain("raw-one-time-token");
  });

  it("validates the email format", async () => {
    const result = await requestPasswordReset(undefined, form({ email: "not-an-email" }));
    expect(result?.errors?.email).toBeDefined();
    expect(mocks.getUserByEmail).not.toHaveBeenCalled();
  });
});

describe("resetPassword", () => {
  const NEW_PASSWORD = "newpass456";

  beforeEach(() => {
    mocks.resetPasswordWithToken.mockReset();
  });

  it("sets a hash of the new password, signs the user in and goes to /today", async () => {
    mocks.resetPasswordWithToken.mockResolvedValue("user-1");

    const target = await redirectTarget(() =>
      resetPassword(
        undefined,
        form({
          token: "raw-one-time-token",
          password: NEW_PASSWORD,
          confirmPassword: NEW_PASSWORD,
        }),
      ),
    );

    expect(target).toBe("/today");
    const [token, passwordHash] = mocks.resetPasswordWithToken.mock.calls[0];
    expect(token).toBe("raw-one-time-token");
    expect(passwordHash).not.toBe(NEW_PASSWORD);
    expect(await bcrypt.compare(NEW_PASSWORD, passwordHash)).toBe(true);
    expect(mocks.jar.has("session")).toBe(true);
  });

  it("rejects an invalid, expired or already-used token without signing in", async () => {
    mocks.resetPasswordWithToken.mockResolvedValue(null);

    const result = await resetPassword(
      undefined,
      form({ token: "spent-token", password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD }),
    );

    expect(result?.message).toContain("invalid, expired, or already used");
    expect(mocks.jar.has("session")).toBe(false);
  });

  it("rejects mismatched or weak passwords before touching the token", async () => {
    const mismatch = await resetPassword(
      undefined,
      form({ token: "t", password: NEW_PASSWORD, confirmPassword: "different1" }),
    );
    const weak = await resetPassword(
      undefined,
      form({ token: "t", password: "short", confirmPassword: "short" }),
    );

    expect(mismatch?.errors?.confirmPassword).toBeDefined();
    expect(weak?.errors?.password).toBeDefined();
    expect(mocks.resetPasswordWithToken).not.toHaveBeenCalled();
  });
});
