"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup } from "@/features/auth/actions";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, undefined);

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <form action={action} className="flex w-full max-w-sm flex-col gap-4">
        <h1 className="retro-heading text-2xl font-bold text-foreground">Create your account</h1>

        <div className="flex flex-col gap-1">
          <label htmlFor="displayName" className="text-sm font-medium">
            Name
          </label>
          <input
            id="displayName"
            name="displayName"
            placeholder="Jane Doe"
            className="rounded-md border border-border bg-card px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {state?.errors?.displayName && (
            <p className="text-sm text-danger">{state.errors.displayName[0]}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
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
            <ul className="text-sm text-danger">
              {state.errors.password.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </div>

        {state?.message && <p className="text-sm text-danger">{state.message}</p>}

        <button
          disabled={pending}
          type="submit"
          className="retro-glow rounded-full bg-primary px-5 py-2 text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {pending ? "Creating account..." : "Sign up"}
        </button>

        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
