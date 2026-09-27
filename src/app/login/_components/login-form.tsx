"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/features/auth/actions";

/** `next` is already validated by the page (safeNextPath) and re-validated by the action. */
export function LoginForm({ next }: { next: string | null }) {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <form action={action} className="flex w-full max-w-sm flex-col gap-4">
        {next && <input type="hidden" name="next" value={next} />}
        <h1 className="retro-heading text-2xl font-bold text-foreground">Log in</h1>

        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            defaultValue={state?.fields?.email}
            type="email"
            placeholder="jane@example.com"
            className="rounded-md border border-border bg-card px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {state?.errors?.email && <p className="text-sm text-danger">{state.errors.email[0]}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className="rounded-md border border-border bg-card px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {state?.errors?.password && (
            <p className="text-sm text-danger">{state.errors.password[0]}</p>
          )}
          <Link
            href="/forgot-password"
            className="self-end text-xs text-muted-foreground underline"
          >
            Forgot password?
          </Link>
        </div>

        {state?.message && <p className="text-sm text-danger">{state.message}</p>}

        <button
          disabled={pending}
          type="submit"
          className="retro-glow rounded-full bg-primary px-5 py-2 text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {pending ? "Logging in..." : "Log in"}
        </button>

        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
            className="font-medium text-primary underline"
          >
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
