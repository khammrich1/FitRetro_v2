import { verifySession } from "@/features/auth";
import { getRoutinesForUser } from "@/features/routines";
import { RoutineCard } from "./_components/routine-card";
import { NewRoutineForm } from "./_components/new-routine-form";

export default async function RoutinePage() {
  const { userId } = await verifySession();
  const routines = await getRoutinesForUser(userId, new Date());

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="retro-heading text-2xl font-bold text-foreground">Routine</h1>
      <p className="text-sm text-muted-foreground">
        Build your own daily routines — morning, evening, whatever you want — and check off each
        step as you go. Add notes under any step for details like today&apos;s affirmation or what
        you&apos;re reading.
      </p>

      {routines.length === 0 ? (
        <p className="text-sm text-muted-foreground">No routines yet — create one below.</p>
      ) : (
        routines.map((routine) => <RoutineCard key={routine.id} routine={routine} />)
      )}

      <NewRoutineForm />
    </div>
  );
}
