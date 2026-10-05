"use client";

import { useTransition } from "react";

/** The "Archived" list under a settings page: what's been removed from Today, with a way back.
 * History is never deleted, so this is the only place an archived item shows up. */
export function ArchivedTemplates({
  items,
  noun,
  restore,
}: {
  items: { id: string; name: string; doseAmount: number; doseUnit: string }[];
  /** "peptide" | "supplement" */
  noun: string;
  restore: (id: string) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Archived
      </h2>
      <p className="text-xs text-muted-foreground">
        Not shown on Today. Every dose you logged is still in your history. Restore one to start
        logging it again.
      </p>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground"
          >
            <span>
              {item.name} — {item.doseAmount}
              {item.doseUnit}
            </span>
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => restore(item.id))}
              aria-label={`Restore ${noun} ${item.name}`}
              className="text-xs hover:text-accent disabled:opacity-50"
            >
              Restore
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
