/** Absolute base URL for links that leave the app (e.g. emailed password reset links). Always
 * configured, never derived from request headers: a forged Host/Origin header must not be able
 * to point a victim's reset email at an attacker's domain. */
export function getAppUrl(): string {
  const configured = process.env.APP_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  return process.env.NODE_ENV === "production" ? "https://fitretro.app" : "http://localhost:3000";
}
