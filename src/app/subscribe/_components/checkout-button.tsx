"use client";

import { useFormStatus } from "react-dom";

/** Disabled while the checkout action runs, so an impatient double tap doesn't fire it twice.
 * (The action also expires any other open Checkout Session server-side.) */
export function CheckoutButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="retro-glow w-full rounded-full bg-primary px-5 py-2 font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
    >
      {pending ? "Starting checkout..." : label}
    </button>
  );
}
