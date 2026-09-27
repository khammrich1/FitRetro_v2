"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPassword } from "@/features/auth/actions";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, undefined);

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <form action={action} className="flex w-full max-w-sm flex-col gap-4">
        <input type="hidden" name="token" value={token} />
        <h1 className="retro-heading text-2xl font-bold text-foreground">Choose a new password</h1>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium">
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            className="rounded-md border border-border bg-card px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {state?.errors?.password && (
            <ul className="text-sm text-danger">
              {state.errors.password.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            className="rounded-md border border-border bg-card px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {state?.errors?.confirmPassword && (
            <p className="text-sm text-danger">{state.errors.confirmPassword[0]}</p>
          )}
        </div>

        {state?.message && (
          <p className="text-sm text-danger">
            {state.message}{" "}
            <Link href="/forgot-password" className="underline">
              Send a new link
            </Link>
          </p>
        )}

        <button
          disabled={pending}
          type="submit"
          className="retro-glow rounded-full bg-primary px-5 py-2 text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save new password"}
        </button>
      </form>
    </div>
  );
}
