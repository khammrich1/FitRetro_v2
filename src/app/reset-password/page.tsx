import type { Metadata } from "next";
import Link from "next/link";
import { isResetTokenUsable } from "@/features/auth/password-reset";
import { ResetPasswordForm } from "./_components/reset-password-form";

// The URL carries a one-time token; don't send it to other sites in the Referer header.
export const metadata: Metadata = { referrer: "no-referrer" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  const usable = typeof token === "string" && token.length > 0 && (await isResetTokenUsable(token));

  if (!usable) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="flex w-full max-w-sm flex-col gap-4">
          <h1 className="retro-heading text-2xl font-bold text-foreground">Link expired</h1>
          <p className="text-sm text-muted-foreground">
            This password reset link is invalid, expired, or already used. Links work once and
            expire after 1 hour.
          </p>
          <Link
            href="/forgot-password"
            className="retro-glow self-start rounded-full bg-primary px-5 py-2 text-primary-foreground hover:bg-primary-hover"
          >
            Send a new link
          </Link>
        </div>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}
