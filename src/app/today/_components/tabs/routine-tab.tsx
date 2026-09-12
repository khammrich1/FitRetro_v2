import type { DailyReading, PeptideTemplate, SupplementTemplate } from "@/db/schema";
import type { RoutineWithItems } from "@/features/routines";
import type { MissionForDay } from "@/features/daily-mission";
import type { PeptideLogWithTemplate } from "@/features/peptides";
import type { SupplementLogWithTemplate } from "@/features/supplements";
import { RoutineChecklistCard } from "../routine/routine-checklist-card";
import { DailyMissionCard } from "../daily-mission-card";
import { DailyNoteCard } from "../daily-note-card";
import { DailyReadingCard } from "../daily-reading-card";
import { PeptideSection } from "../peptides/peptide-section";
import { SupplementSection } from "../supplements/supplement-section";

export function RoutineTab({
  dayIso,
  routines,
  mission,
  note,
  reading,
  peptideTemplates,
  peptideLogs,
  mostRecentPeptideLogDates,
  supplementTemplates,
  supplementLogs,
  mostRecentSupplementLogDates,
}: {
  dayIso: string;
  routines: RoutineWithItems[];
  mission: MissionForDay;
  note: string;
  reading: DailyReading | null;
  peptideTemplates: PeptideTemplate[];
  peptideLogs: PeptideLogWithTemplate[];
  mostRecentPeptideLogDates: Record<string, string>;
  supplementTemplates: SupplementTemplate[];
  supplementLogs: SupplementLogWithTemplate[];
  mostRecentSupplementLogDates: Record<string, string>;
}) {
  const hasDoses = peptideTemplates.length > 0 || supplementTemplates.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {routines.length > 0 && (
        <section className="flex flex-col gap-3">
          {routines.map((routine) => (
            <RoutineChecklistCard key={routine.id} routine={routine} dayIso={dayIso} />
          ))}
        </section>
      )}

      <DailyMissionCard mission={mission} dayIso={dayIso} />
      <DailyNoteCard dayIso={dayIso} note={note} />
      <DailyReadingCard reading={reading} />

      {hasDoses && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">Doses</h2>
          {peptideTemplates.length > 0 && (
            <PeptideSection
              dayIso={dayIso}
              templates={peptideTemplates}
              logs={peptideLogs}
              mostRecentLogDates={mostRecentPeptideLogDates}
            />
          )}
          {supplementTemplates.length > 0 && (
            <SupplementSection
              dayIso={dayIso}
              templates={supplementTemplates}
              logs={supplementLogs}
              mostRecentLogDates={mostRecentSupplementLogDates}
            />
          )}
        </section>
      )}
    </div>
  );
}
