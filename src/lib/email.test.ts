// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { sendEmail } = await import("./email");

const EMAIL = {
  to: "member@example.com",
  subject: "Reset your FitRetro password",
  text: "Reset here: https://fitretro.app/reset-password?token=one-time-token",
  html: "<p>Reset</p>",
};

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue(new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("sendEmail", () => {
  it("sends through Resend when configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_placeholder");
    vi.stubEnv("EMAIL_FROM", "FitRetro <no-reply@fitretro.app>");

    await sendEmail(EMAIL);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer re_test_placeholder");
    expect(JSON.parse(init.body)).toEqual({
      from: "FitRetro <no-reply@fitretro.app>",
      to: ["member@example.com"],
      subject: EMAIL.subject,
      text: EMAIL.text,
      html: EMAIL.html,
    });
  });

  it("throws on a provider error without echoing the API key", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_placeholder");
    vi.stubEnv("EMAIL_FROM", "no-reply@fitretro.app");
    fetchMock.mockResolvedValue(new Response("nope", { status: 422 }));

    const failure = sendEmail(EMAIL);
    await expect(failure).rejects.toThrow("HTTP 422");
    await expect(failure).rejects.not.toThrow("re_test_placeholder");
  });

  it("prints the email instead of sending when unconfigured in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RESEND_API_KEY", "");

    await sendEmail(EMAIL);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(console.info).toHaveBeenCalledWith(expect.stringContaining(EMAIL.text));
  });

  it("refuses when unconfigured in production, and never logs the one-time link", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "");

    await expect(sendEmail(EMAIL)).rejects.toThrow("Email is not configured");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
  });
});
