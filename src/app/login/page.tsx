import { safeNextPath } from "@/lib/safe-redirect";
import { LoginForm } from "./_components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; notice?: string | string[] }>;
}) {
  const { next, notice } = await searchParams;
  return (
    <LoginForm
      next={safeNextPath(next)}
      notice={
        notice === "signed_out_everywhere"
          ? "You've been signed out of every device. Log in again to continue."
          : notice === "session_expired"
            ? "Your session has ended — this happens after a password reset or signing out everywhere. Log in again to continue."
            : null
      }
    />
  );
}
