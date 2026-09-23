const PLACEHOLDER_ORIGIN = "http://same-origin.invalid";

/** Returns `value` as a same-origin path ("/subscribe", "/today?x=1") safe to redirect to, or
 * null for anything else — absolute URLs, protocol-relative "//host", backslash tricks
 * ("/\host"), or non-strings. Used for the `next` return destination on login/signup, which
 * arrives as untrusted user input. */
export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  // Control characters (including tab/newline, which URL parsing silently strips).
  if (/[\u0000-\u001f\u007f]/.test(value)) return null;

  let url: URL;
  try {
    url = new URL(value, PLACEHOLDER_ORIGIN);
  } catch {
    return null;
  }
  if (url.origin !== PLACEHOLDER_ORIGIN) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}
