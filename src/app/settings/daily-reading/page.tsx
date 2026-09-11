import { getCurrentUser } from "@/features/auth";
import { parseReadingTopics, READING_TOPICS, READING_TOPIC_LABELS } from "@/lib/reading-topics";
import { setReadingTopicsAction } from "@/app/daily-reading/actions";

export default async function DailyReadingSettingsPage() {
  const user = await getCurrentUser();
  const subscribed = parseReadingTopics(user?.readingTopics);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="retro-heading text-2xl font-bold text-foreground">Daily Reader</h1>
      <p className="text-sm text-muted-foreground">
        Pick the topics you want a short (5-10 minute) daily read on. It shows up on the Routine tab
        of Today, right next to the rest of your routine. Leave everything unchecked to turn it off.
      </p>

      <form
        action={setReadingTopicsAction}
        className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
      >
        <div className="flex flex-col gap-2">
          {READING_TOPICS.map((topic) => (
            <label key={topic} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="topics"
                value={topic}
                defaultChecked={subscribed.includes(topic)}
                className="h-4 w-4 accent-primary"
              />
              {READING_TOPIC_LABELS[topic]}
            </label>
          ))}
        </div>
        <button
          type="submit"
          className="retro-glow self-start rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary-hover"
        >
          Save
        </button>
      </form>
    </div>
  );
}
