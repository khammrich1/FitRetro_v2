import Link from "next/link";
import { verifySession } from "@/features/auth";
import { getRoutinesForUser } from "@/features/routines";
import { RoutineChecklistCard } from "./_components/routine-checklist-card";

export default async function RoutinePage() {
  const { userId } = await verifySession();
  const routines = await getRoutinesForUser(userId, new Date());

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="retro-heading text-2xl font-bold text-foreground">Routine</h1>
      <p className="text-sm text-muted-foreground">
        Check off each step as you go today. Add a note under a completed step for details like what
        you actually ate or did. Build or edit your routines in{" "}
        <Link href="/settings/routines" className="text-accent underline">
          Settings
        </Link>
        .
      </p>

      {routines.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No routines yet —{" "}
          <Link href="/settings/routines" className="text-accent underline">
            create one in Settings
          </Link>
          .
        </p>
      ) : (
        routines.map((routine) => <RoutineChecklistCard key={routine.id} routine={routine} />)
      )}
    </div>
  );
}
