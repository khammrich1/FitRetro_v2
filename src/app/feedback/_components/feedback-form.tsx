"use client";

import { useActionState } from "react";
import { feedbackCategoryEnum } from "@/db/schema";
import { submitFeedbackAction } from "@/app/feedback/actions";

const CATEGORY_LABELS: Record<(typeof feedbackCategoryEnum.enumValues)[number], string> = {
  bug: "Bug report",
  idea: "Feature idea",
  other: "Other",
};

export function FeedbackForm() {
  const [state, action, pending] = useActionState(submitFeedbackAction, undefined);

  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">Send feedback</h2>
      <label className="flex flex-col gap-1 text-sm">
        Category
        <select
          name="category"
          defaultValue="bug"
          className="rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {feedbackCategoryEnum.enumValues.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        What&apos;s on your mind?
        <textarea
          name="message"
          rows={4}
          placeholder="Found a bug, have an idea, or just want to say something — this goes straight to the person building the app."
          className="rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {state?.errors?.message && <span className="text-danger">{state.errors.message[0]}</span>}
      </label>
      <button
        disabled={pending}
        type="submit"
        className="retro-glow self-start rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "Sending..." : "Send feedback"}
      </button>
    </form>
  );
}
