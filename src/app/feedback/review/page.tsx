import { requireOwner } from "@/features/auth";
import { getAllFeedback } from "@/features/feedback";
import { FeedbackReviewRow } from "./_components/feedback-review-row";

export default async function FeedbackReviewPage() {
  await requireOwner();
  const submissions = await getAllFeedback();
  const open = submissions.filter((item) => item.status === "open");
  const resolved = submissions.filter((item) => item.status === "resolved");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="retro-heading text-2xl font-bold text-foreground">Review Feedback</h1>

      {submissions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No feedback submitted yet.</p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">
              Open ({open.length})
            </h2>
            {open.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing open.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {open.map((item) => (
                  <FeedbackReviewRow key={item.id} item={item} />
                ))}
              </ul>
            )}
          </div>

          {resolved.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">
                Resolved ({resolved.length})
              </h2>
              <ul className="flex flex-col gap-2 opacity-60">
                {resolved.map((item) => (
                  <FeedbackReviewRow key={item.id} item={item} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
