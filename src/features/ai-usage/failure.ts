import Anthropic from "@anthropic-ai/sdk";

export const AI_UNAVAILABLE_MESSAGE =
  "AI features aren't available right now — you can still enter everything manually. Try again in a minute.";

/** Messages the app raises on purpose, written for the screen. Anything else that reaches
 * describeAiFailure is an internal error whose text may carry SQL, prompts or stack details. */
const OWN_MESSAGE_PREFIXES = ["ANTHROPIC_API_KEY is not configured", "Failed to parse"];

/** The SQLSTATE (or other driver code) of an error, looking through Drizzle's wrapper: a query
 * failure arrives as DrizzleQueryError with the PostgresError on `cause`. Safe to log — it is a
 * five-character class, never the statement or its parameters. */
export function errorCode(error: unknown): string {
  for (let current = error, depth = 0; current && depth < 3; depth++) {
    if (typeof current !== "object") break;
    if ("code" in current && current.code !== undefined) return String(current.code);
    current = (current as { cause?: unknown }).cause;
  }
  return "";
}

/** Turns whatever an AI action threw into a line that is safe and useful on screen. Provider
 * errors get an honest message by status; the app's own messages pass through; everything else
 * (a database failure, a bug) gets the fallback and a log line with the error's name and code
 * only — never its message. */
export function describeAiFailure(error: unknown, fallback = AI_UNAVAILABLE_MESSAGE): string {
  if (error instanceof Anthropic.APIError) {
    const status = error.status;
    const message = error.message ?? "";
    if (status === 401 || status === 403) {
      return "The AI service rejected this app's credentials — the owner needs to check the API key. You can still enter everything manually.";
    }
    if (status === 400 && /credit|billing|balance|spend limit/i.test(message)) {
      return "The AI service is out of credit right now. You can still enter everything manually.";
    }
    if (status === 429) {
      return "The AI service is busy — try again in a minute, or enter it manually.";
    }
    if (status === undefined || status >= 500) {
      return "The AI service isn't responding — try again in a minute, or enter it manually.";
    }
    console.error("AI provider error", status, error.name);
    return "The AI service returned an error — try again in a minute, or enter it manually.";
  }
  if (error instanceof Error && OWN_MESSAGE_PREFIXES.some((p) => error.message.startsWith(p))) {
    return error.message;
  }
  console.error(
    "AI action failed",
    error instanceof Error ? error.name : typeof error,
    errorCode(error),
  );
  return fallback;
}
