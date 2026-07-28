import Link from "next/link";

const SETTINGS_SECTIONS = [
  {
    href: "/settings/nutrition",
    title: "Nutrition goals",
    description: "Daily calorie and macro targets.",
  },
  {
    href: "/settings/meal-templates",
    title: "Meal templates",
    description: "Save meals you eat often for one-tap logging.",
  },
  {
    href: "/settings/workouts",
    title: "Workouts",
    description: "Workout rotation and reusable exercise templates.",
  },
  {
    href: "/settings/routines",
    title: "Routine templates",
    description: "Build your daily routines and their steps.",
  },
  {
    href: "/settings/peptides",
    title: "Peptides",
    description: "Peptides you take, their dose, and frequency.",
  },
];

export default function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="retro-heading text-2xl font-bold text-foreground">Settings</h1>
      <p className="text-sm text-muted-foreground">
        Configure the things that don&apos;t change day to day. Day-to-day tracking happens on the{" "}
        <Link href="/today" className="text-accent underline">
          Today
        </Link>{" "}
        page.
      </p>
      <div className="flex flex-col gap-3">
        {SETTINGS_SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-lg border border-border bg-card p-4 hover:border-accent"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">
              {section.title}
            </h2>
            <p className="text-sm text-muted-foreground">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
