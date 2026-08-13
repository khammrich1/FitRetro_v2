"use client";

import { useTransition } from "react";
import type { FeedbackWithSubmitter } from "@/features/feedback";
import { updateFeedbackStatusAction } from "@/app/feedback/actions";

const CATEGORY_LABELS: Record<string, string> = {
  bug: "Bug report",
  idea: "Feature idea",
  other: "Other",
};

export function FeedbackReviewRow({ item }: { item: FeedbackWithSubmitter }) {
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await updateFeedbackStatusAction(item.id, item.status === "open" ? "resolved" : "open");
    });
  }

  return (
    <li className="flex flex-col gap-2 rounded-md border border-border bg-background p-3 text-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-accent">
            {CATEGORY_LABELS[item.category] ?? item.category}
          </span>
          <span className="text-xs text-muted-foreground">
            {item.submitterName} ({item.submitterEmail})
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(item.createdAt).toLocaleDateString()}
        </span>
      </div>
      <p>{item.message}</p>
      <button
        onClick={handleToggle}
        disabled={pending}
        className="self-start text-xs text-muted-foreground hover:text-accent disabled:opacity-50"
      >
        {item.status === "open" ? "Mark resolved" : "Mark open"}
      </button>
    </li>
  );
}
