type FaqItem = {
  q: string;
  a: string[];
};

type FaqSection = {
  title: string;
  items: FaqItem[];
};

const SECTIONS: FaqSection[] = [
  {
    title: "Nutrition",
    items: [
      {
        q: "Can I just snap a picture of my food instead of typing it in?",
        a: [
          'Yes. On Today > Log a meal, tap the 📷 button next to the description field and choose a photo. Then hit "Estimate macros" — Claude looks at the photo (plus any note you typed alongside it) and fills in the item list and macros for you.',
          "Everything it fills in is editable afterward, so you can nudge portion sizes or swap an item if it guessed wrong before you log it.",
        ],
      },
      {
        q: "What if I'd rather just describe what I ate?",
        a: [
          'Type a description like "40g chicken breast, 1 cup rice, 10g mixed vegetables" and hit "Estimate macros" — no photo needed. You can also tap the 🎤 button to describe it by voice instead of typing.',
          'You can combine both: add a photo and a short note (e.g. "used a smaller plate") for a more accurate estimate.',
        ],
      },
      {
        q: "Do I have to use the estimator at all?",
        a: [
          "No — you can skip it entirely and type calories/protein/carbs/fat into an item yourself. The estimator is just there to save time when you don't know the numbers off the top of your head.",
        ],
      },
      {
        q: 'What are "Food suggestions" and where do they come from?',
        a: [
          "On Today, the Food suggestions panel proposes meals based on whatever's left of your daily macro targets (not the full targets) — so it adjusts as you log meals throughout the day.",
          'It prioritizes items sitting in your Pantry when they fit, and you can type a craving or constraint ("feeling like Mexican", "have leftover chicken") to steer it.',
          "For each suggestion you can Log as-is, Adjust & log (breaks it into editable items first), or Get recipe for ingredients + instructions.",
        ],
      },
      {
        q: "What's the Pantry for?",
        a: [
          "It's just a list of what you have on hand. It doesn't track macros itself — it's used to bias Food suggestions toward things you already have, so you get fewer suggestions requiring a grocery run.",
        ],
      },
      {
        q: "I eat the same meal a lot — do I have to re-estimate macros every time?",
        a: [
          'No — save it as a meal template in Settings > Nutrition. Describe it once (type, speak, or a photo), estimate its macros, then save. From then on it shows up on Today under "Meal templates": "Log as-is" logs it instantly with those saved macros, or "Adjust & log" loads it into the custom form below for editing first (e.g. if the portion was a bit different that day).',
          "Reorder templates with the ↑/↓ buttons in Settings — same order they show up in on Today.",
        ],
      },
    ],
  },
  {
    title: "Workouts",
    items: [
      {
        q: "How do I log a workout?",
        a: [
          "On Today > Workouts, add exercises and sets (reps, weight, duration, RPE — whatever applies), or describe the workout in words and let it estimate the breakdown for you, same idea as meal logging.",
          'If you\'ve saved a template in Settings > Workouts, tap it under "Start from a template" — this immediately saves a workout for today and fills in its exercises, so you can enter reps/weight per set as you actually do them. It autosaves as you go, so closing the tab or refreshing mid-workout won\'t lose your progress. Tap "Finish workout" when you\'re done.',
          'Prefer to build something on the spot instead? Skip the templates and use the "Log a workout" form below them — nothing saves there until you hit "Log workout."',
        ],
      },
      {
        q: "What's the workout rotation on Today, and why doesn't it follow specific days of the week?",
        a: [
          "It's an ordered list of steps (e.g. Push, Pull, Legs) that repeats — but it only advances when you check off that day's target. If you skip a day or take a rest day, the rotation holds its place instead of drifting or forcing you into an awkward day-of-week mismatch.",
          "Build the rotation's steps in Settings > Workouts. Checking the box on Today's target card advances to the next step; unchecking it moves back.",
        ],
      },
      {
        q: "What are Exercise suggestions based on?",
        a: [
          'Whatever muscle groups are on today\'s rotation target. Set your rotation up in Settings > Workouts to unlock these — add equipment notes or exercises to avoid, and tap "+ Add to log" on any suggestion to drop it straight into the log form.',
        ],
      },
      {
        q: "Can I reorder my workout templates?",
        a: [
          'Yes — in Settings > Workouts, each template has ↑/↓ buttons to move it up or down the list. That\'s also the order they show up in under "Start from a template" on Today.',
        ],
      },
    ],
  },
  {
    title: "Routines",
    items: [
      {
        q: 'What\'s a "Routine" and how is it different from a workout?',
        a: [
          "A Routine is a repeatable daily checklist you define yourself — morning or evening steps, a reading habit, an affirmation, anything you want to make sure happens each day. It's unrelated to exercise.",
          "Build routines and their steps in Settings > Routine templates; check them off day to day on Today.",
        ],
      },
      {
        q: "Can I leave notes on a routine step?",
        a: [
          "Two kinds: a static note on the step itself (set in Settings, e.g. today's reading assignment) and a per-day completion note that appears once you check the step off, for jotting what you actually did.",
        ],
      },
    ],
  },
  {
    title: "Peptides",
    items: [
      {
        q: "How does the peptide tracker know when something is due?",
        a: [
          "For frequencies with a fixed interval (daily, every other day, weekly), it compares today's date to your last logged dose and flags it as due once that interval has passed.",
          "For frequencies without a single clean interval (a couple times a week, as-needed), it's always available to log rather than guessing which specific days count.",
        ],
      },
      {
        q: "Does it remind me or send notifications?",
        a: [
          "No — it's reference-only. It shows what's due on Today so you can log it, but there's no due-date enforcement or push reminders.",
        ],
      },
    ],
  },
  {
    title: "Supplements",
    items: [
      {
        q: "How is this different from Peptides?",
        a: [
          "Same model, separate list — define supplements in Settings > Supplements with a name, dose, and frequency, then log doses on Today the same way you would a peptide.",
          "They're kept separate so peptide protocols and everyday supplements (vitamins, creatine, etc.) don't get mixed into one list.",
        ],
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="retro-heading text-2xl font-bold text-foreground">Help &amp; FAQ</h1>
        <p className="text-sm text-muted-foreground">
          A quick tour of what FitRetro can do — including a few things that aren&apos;t obvious at
          a glance, like snapping a photo of your food to estimate macros.
        </p>
      </div>

      {SECTIONS.map((section) => (
        <section key={section.title} className="flex flex-col gap-4">
          <h2 className="retro-heading text-lg font-semibold text-primary">{section.title}</h2>
          <div className="flex flex-col gap-3">
            {section.items.map((item) => (
              <details
                key={item.q}
                className="group rounded-lg border border-border bg-card p-4 open:border-accent"
              >
                <summary className="cursor-pointer list-none text-sm font-semibold text-foreground marker:content-none">
                  <span className="mr-2 text-accent group-open:hidden">+</span>
                  <span className="mr-2 hidden text-accent group-open:inline">−</span>
                  {item.q}
                </summary>
                <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
                  {item.a.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
