"use client";

import { useTransition } from "react";
import type { PeptideTemplate } from "@/db/schema";
import type { PeptideLogWithTemplate } from "@/features/peptides";
import { logPeptideDoseAction, deletePeptideLogAction } from "@/app/peptides/actions";

function LoggedPeptideRow({ log }: { log: PeptideLogWithTemplate }) {
  const [pending, startTransition] = useTransition();

  function handleRemove() {
    startTransition(async () => {
      await deletePeptideLogAction(log.id);
    });
  }

  return (
    <li className="flex items-center justify-between rounded-md border border-border bg-background p-2 text-sm">
      <span>
        {log.template.name} — {log.template.doseAmount}
        {log.template.doseUnit}
      </span>
      <button
        onClick={handleRemove}
        disabled={pending}
        className="text-xs text-muted-foreground hover:text-danger"
      >
        Remove
      </button>
    </li>
  );
}

export function PeptideSection({
  dayIso,
  templates,
  logs,
}: {
  dayIso: string;
  templates: PeptideTemplate[];
  logs: PeptideLogWithTemplate[];
}) {
  const [pending, startTransition] = useTransition();

  function handleAdd(templateId: string) {
    startTransition(async () => {
      await logPeptideDoseAction(templateId, dayIso);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No peptides yet — add one in Settings &gt; Peptides.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Add a dose:</span>
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => handleAdd(template.id)}
              disabled={pending}
              className="rounded-full border border-border px-3 py-1 text-xs hover:border-accent hover:text-accent disabled:opacity-50"
            >
              {template.name} ({template.doseAmount}
              {template.doseUnit})
            </button>
          ))}
        </div>
      )}

      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No doses logged for this day.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {logs.map((log) => (
            <LoggedPeptideRow key={log.id} log={log} />
          ))}
        </ul>
      )}
    </div>
  );
}
