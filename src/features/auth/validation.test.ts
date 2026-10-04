import { describe, expect, it } from "vitest";
import { signupSchema, loginSchema, resetPasswordSchema } from "./validation";

describe("signupSchema", () => {
  it("accepts a valid signup", () => {
    const result = signupSchema.safeParse({
      displayName: "Jane Doe",
      email: "jane@example.com",
      password: "password1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a password with no digit", () => {
    const result = signupSchema.safeParse({
      displayName: "Jane Doe",
      email: "jane@example.com",
      password: "onlyletters",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = signupSchema.safeParse({
      displayName: "Jane Doe",
      email: "not-an-email",
      password: "password1",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({ email: "jane@example.com", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  const valid = { token: "abc", password: "newpass123", confirmPassword: "newpass123" };

  it("accepts a matching, valid new password", () => {
    expect(resetPasswordSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects mismatched confirmation", () => {
    const result = resetPasswordSchema.safeParse({ ...valid, confirmPassword: "newpass124" });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.confirmPassword).toEqual(["Passwords don't match."]);
  });

  it("applies the same strength rules as signup", () => {
    const result = resetPasswordSchema.safeParse({
      ...valid,
      password: "short",
      confirmPassword: "short",
    });
    expect(result.success).toBe(false);
  });

  it("requires a token", () => {
    expect(resetPasswordSchema.safeParse({ ...valid, token: "" }).success).toBe(false);
  });
});

describe("password length", () => {
  const base = { displayName: "Kyle", email: "kyle@example.com" };

  it("accepts up to 72 bytes and rejects anything longer", () => {
    const seventyTwo = "a1".repeat(36);
    expect(signupSchema.safeParse({ ...base, password: seventyTwo }).success).toBe(true);
    expect(signupSchema.safeParse({ ...base, password: `${seventyTwo}x` }).success).toBe(false);
  });

  it("counts bytes, not characters — bcrypt only hashes the first 72 bytes", () => {
    // 24 three-byte characters plus "a1" = 74 bytes but only 26 characters.
    const multiByte = `${"€".repeat(24)}a1`;
    const result = signupSchema.safeParse({ ...base, password: multiByte });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/72 bytes/);
    }
  });
});
