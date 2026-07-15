import { describe, expect, it } from "vitest";
import { signupSchema, loginSchema } from "./validation";

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
