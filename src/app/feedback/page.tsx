import { verifySession } from "@/features/auth";
import { getFeedbackForUser } from "@/features/feedback";
import { FeedbackForm } from "./_components/feedback-form";

const CATEGORY_LABELS: Record<string, string> = {
  bug: "Bug report",
  idea: "Feature idea",
  other: "Other",
};

export default async function FeedbackPage() {
  const { userId } = await verifySession();
  const submissions = await getFeedbackForUser(userId);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="retro-heading text-2xl font-bold text-foreground">Feedback</h1>
      <p className="text-sm text-muted-foreground">
        Bug reports, feature ideas, or anything else about the app itself — not related to your
        workouts or meals.
      </p>

      <FeedbackForm />

      {submissions.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">
            Your submissions
          </h2>
          <ul className="flex flex-col gap-2">
            {submissions.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-1 rounded-md border border-border bg-background p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {CATEGORY_LABELS[item.category] ?? item.category}
                  </span>
                  <span
                    className={
                      item.status === "resolved"
                        ? "text-xs text-accent"
                        : "text-xs text-muted-foreground"
                    }
                  >
                    {item.status === "resolved" ? "Resolved" : "Open"}
                  </span>
                </div>
                <p>{item.message}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
