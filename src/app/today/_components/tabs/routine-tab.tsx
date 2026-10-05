import type { DailyReading, PeptideTemplate, SupplementTemplate } from "@/db/schema";
import type { RoutineWithItems } from "@/features/routines";
import type { MissionForDay } from "@/features/daily-mission";
import type { PeptideLogWithTemplate } from "@/features/peptides";
import type { SupplementLogWithTemplate } from "@/features/supplements";
import { RoutineChecklistCard } from "../routine/routine-checklist-card";
import { DailyMissionCard } from "../daily-mission-card";
import { DailyNoteCard } from "../daily-note-card";
import { DailyReadingCard } from "../daily-reading-card";
import type { LevelEstimate } from "@/features/peptides";
import { PeptideSection } from "../peptides/peptide-section";
import { SupplementSection } from "../supplements/supplement-section";

export function RoutineTab({
  dayIso,
  todayIso,
  routines,
  mission,
  note,
  reading,
  peptideTemplates,
  peptideLogs,
  mostRecentPeptideLogDates,
  currentLevelByTemplate,
  supplementTemplates,
  supplementLogs,
  mostRecentSupplementLogDates,
}: {
  dayIso: string;
  todayIso: string;
  routines: RoutineWithItems[];
  mission: MissionForDay;
  note: string;
  reading: DailyReading | null;
  peptideTemplates: PeptideTemplate[];
  peptideLogs: PeptideLogWithTemplate[];
  mostRecentPeptideLogDates: Record<string, string>;
  currentLevelByTemplate: Record<string, LevelEstimate>;
  supplementTemplates: SupplementTemplate[];
  supplementLogs: SupplementLogWithTemplate[];
  mostRecentSupplementLogDates: Record<string, string>;
}) {
  // Logged doses must stay visible even after their template is archived (the dose was still
  // taken that day), so the section keys off logs as well as current templates.
  const showPeptides = peptideTemplates.length > 0 || peptideLogs.length > 0;
  const showSupplements = supplementTemplates.length > 0 || supplementLogs.length > 0;
  const hasDoses = showPeptides || showSupplements;

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
          {showPeptides && (
            <PeptideSection
              dayIso={dayIso}
              todayIso={todayIso}
              templates={peptideTemplates}
              logs={peptideLogs}
              mostRecentLogDates={mostRecentPeptideLogDates}
              currentLevelByTemplate={currentLevelByTemplate}
            />
          )}
          {showSupplements && (
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
