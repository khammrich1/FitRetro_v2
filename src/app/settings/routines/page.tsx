import Link from "next/link";
import { verifySession } from "@/features/auth";
import { getRoutinesForUser } from "@/features/routines";
import { RoutineTemplateCard } from "./_components/routine-template-card";
import { NewRoutineForm } from "./_components/new-routine-form";

export default async function RoutineSettingsPage() {
  const { userId } = await verifySession();
  const routines = await getRoutinesForUser(userId, new Date());

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="retro-heading text-2xl font-bold text-foreground">Routine templates</h1>
      <p className="text-sm text-muted-foreground">
        Build your daily routines here — name them, add steps, reorder, and add notes for detail
        (today&apos;s affirmation, what to read, etc). Head to the{" "}
        <Link href="/today" className="text-accent underline">
          Today
        </Link>{" "}
        page to check things off day to day.
      </p>

      {routines.length === 0 ? (
        <p className="text-sm text-muted-foreground">No routines yet — create one below.</p>
      ) : (
        routines.map((routine) => <RoutineTemplateCard key={routine.id} routine={routine} />)
      )}

      <NewRoutineForm />
    </div>
  );
}
