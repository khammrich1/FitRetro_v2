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

        <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
          <p className="text-sm font-medium">Optional — get a starting macro goal</p>
          <p className="text-xs text-muted-foreground">
            Fill in all four and we&apos;ll suggest daily calorie/protein/carb/fat targets to start
            from (edit anytime in Settings &gt; Nutrition). Leave any blank to skip this.
          </p>

          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              Sex
              <select
                name="sex"
                defaultValue=""
                className="rounded-md border border-border bg-background px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">—</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm">
              Age
              <input
                name="age"
                type="number"
                min={0}
                className="rounded-md border border-border bg-background px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
          </div>
          {(state?.errors?.sex || state?.errors?.age) && (
            <p className="text-sm text-danger">
              {state?.errors?.sex?.[0] ?? state?.errors?.age?.[0]}
            </p>
          )}

          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              Height (ft)
              <input
                name="heightFeet"
                type="number"
                min={0}
                placeholder="5"
                className="rounded-md border border-border bg-background px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm">
              Height (in)
              <input
                name="heightInches"
                type="number"
                min={0}
                max={11.9}
                step="any"
                placeholder="9"
                className="rounded-md border border-border bg-background px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm">
              Weight (lb)
              <input
                name="weightLbs"
                type="number"
                min={0}
                step="any"
                className="rounded-md border border-border bg-background px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
          </div>
          {(state?.errors?.heightFeet ||
            state?.errors?.heightInches ||
            state?.errors?.weightLbs) && (
            <p className="text-sm text-danger">
              {state?.errors?.heightFeet?.[0] ??
                state?.errors?.heightInches?.[0] ??
                state?.errors?.weightLbs?.[0]}
            </p>
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
