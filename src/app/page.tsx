import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth";

type Feature = {
  title: string;
  description: string;
};

const FEATURES: Feature[] = [
  {
    title: "Workout tracking",
    description:
      "Log exercises and sets, run a repeating split rotation, save templates, and get AI exercise suggestions for whatever muscle groups are up today.",
  },
  {
    title: "Nutrition & macros",
    description:
      "Snap a photo or describe a meal and let AI estimate the macros — or type them in yourself. Get food suggestions based on what's actually left of your daily targets.",
  },
  {
    title: "Habits & routines",
    description:
      "Build a repeatable daily checklist — morning routine, evening routine, anything — with per-step notes and streaks.",
  },
  {
    title: "Body measurements",
    description:
      "Track weight, height, and body fat over time, and see it folded into your daily macro goals.",
  },
  {
    title: "Peptides & supplements",
    description:
      "Keep your own list with dose and frequency, log doses day to day, and see what's due at a glance.",
  },
  {
    title: "Daily score & calendar",
    description:
      "Every logged meal, set, habit, and dose adds up to a daily score. Browse a full month at a glance and jump into any day.",
  },
];

export default async function Home() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/today");
  }

  return (
    <div className="flex flex-1 flex-col">
      <section className="flex flex-col items-center gap-6 px-6 py-24 text-center">
        <h1 className="retro-heading text-5xl font-bold text-primary sm:text-6xl">FitRetro</h1>
        <p className="max-w-xl text-lg leading-8 text-muted-foreground">
          Track workouts, nutrition, body measurements, and habits in one place — with AI-assisted
          macro estimation so logging a meal takes seconds, not a food scale.
        </p>
        <div className="flex gap-3">
          <Link
            href="/signup"
            className="retro-glow rounded-full bg-primary px-6 py-2.5 font-medium text-primary-foreground hover:bg-primary-hover"
          >
            Sign up free
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-border px-6 py-2.5 font-medium text-foreground hover:border-primary"
          >
            Log in
          </Link>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 px-6 pb-20 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="flex flex-col gap-2 rounded-lg border border-border bg-card p-5"
          >
            <h3 className="retro-heading text-sm font-semibold text-accent">{feature.title}</h3>
            <p className="text-sm leading-6 text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col items-center gap-6 border-t border-border px-6 py-20">
        <h2 className="retro-heading text-2xl font-bold text-foreground">Pricing</h2>
        <div className="flex w-full max-w-xs flex-col items-center gap-4 rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-4xl font-bold text-primary">
            $8<span className="text-base font-normal text-muted-foreground">/month</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Everything above, unlimited logging, cancel anytime.
          </p>
          <p className="text-xs text-muted-foreground/70">
            Free while billing finishes rolling out — no card required today.
          </p>
          <Link
            href="/signup"
            className="retro-glow w-full rounded-full bg-primary px-5 py-2 font-medium text-primary-foreground hover:bg-primary-hover"
          >
            Get started
          </Link>
        </div>
      </section>
    </div>
  );
}
