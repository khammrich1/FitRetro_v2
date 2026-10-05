import type { MuscleGroup } from "@/db/schema";

/** Static, reviewed warm-up / cooldown content for the Today workout guide (issue #43). No AI,
 * no persistence: everything here is fixed text keyed by the muscle groups the split already
 * uses. Sources and selection rationale are in docs/workout-session-guide.md. */

export type Movement = {
  /** Stable id, so the same movement reached through two muscle groups is shown once. */
  id: string;
  name: string;
  /** One or two plain sentences; gentle, comfortable range of motion throughout. */
  how: string;
  /** Reps (dynamic) or hold time (static), e.g. "8–10 each side" / "Hold 20–30 s each side". */
  dose: string;
  /** Areas it works, shown as small tags. */
  targets: string[];
};

export type SessionStep = {
  title: string;
  detail: string;
};

/** The owner's session structure, in order. The seven minutes is their preference; nothing
 * here prescribes a post-lifting cardio length. */
export const SESSION_SEQUENCE: SessionStep[] = [
  {
    title: "Cardio warm-up",
    detail:
      "About 7 minutes of easy cardio — bike, rower, incline walk. Enough to feel warm and breathe a little harder, not to tire out.",
  },
  {
    title: "Dynamic mobility",
    detail:
      "Moving, not holding: take each joint through a comfortable range for the muscles you're about to train.",
  },
  {
    title: "Lifting",
    detail: "Start each exercise with one or two lighter warm-up sets before your working weight.",
  },
  {
    title: "Post-lifting cardio",
    detail: "Easy pace for however long fits your day — this is a wind-down, not a second workout.",
  },
  {
    title: "Cooldown stretching",
    detail:
      "Gentle static holds for what you trained. Ease into a mild stretch and breathe; it should never hurt.",
  },
];

const DYNAMIC: Record<MuscleGroup, Movement[]> = {
  chest: [
    {
      id: "arm-circles",
      name: "Arm circles",
      how: "Arms out to the sides, draw small circles and let them grow, then reverse.",
      dose: "10 each direction",
      targets: ["shoulders", "chest"],
    },
    {
      id: "band-pull-aparts",
      name: "Band pull-aparts",
      how: "Hold a light band at shoulder height, pull it apart by squeezing your shoulder blades, return slowly.",
      dose: "12–15",
      targets: ["upper back", "rear shoulders"],
    },
    {
      id: "wall-slides",
      name: "Wall slides",
      how: "Back and arms against a wall in a goalpost shape, slide the arms up and down while keeping contact.",
      dose: "8–10",
      targets: ["shoulders", "upper back"],
    },
    {
      id: "push-up-plus",
      name: "Push-up plus",
      how: "At the top of a push-up (or on your knees), push the floor away so the shoulder blades spread, then let them come together.",
      dose: "8–10",
      targets: ["chest", "serratus"],
    },
  ],
  back: [
    {
      id: "arm-circles",
      name: "Arm circles",
      how: "Arms out to the sides, draw small circles and let them grow, then reverse.",
      dose: "10 each direction",
      targets: ["shoulders", "chest"],
    },
    {
      id: "band-pull-aparts",
      name: "Band pull-aparts",
      how: "Hold a light band at shoulder height, pull it apart by squeezing your shoulder blades, return slowly.",
      dose: "12–15",
      targets: ["upper back", "rear shoulders"],
    },
    {
      id: "thoracic-rotations",
      name: "Thoracic rotations",
      how: "On all fours, hand behind your head, rotate the elbow toward the ceiling and back down, following with your eyes.",
      dose: "8 each side",
      targets: ["upper back"],
    },
    {
      id: "cat-cow",
      name: "Cat–cow",
      how: "On all fours, round the back toward the ceiling, then let the belly drop and lift the chest. Move slowly with your breath.",
      dose: "8–10",
      targets: ["spine", "upper back"],
    },
    {
      id: "scapular-pull-ups",
      name: "Scapular pull-ups (or band lat pulls)",
      how: "Hang from a bar with straight arms and pull the shoulder blades down and back without bending the elbows; or pull a band down with straight arms.",
      dose: "8–10",
      targets: ["lats", "shoulder blades"],
    },
  ],
  shoulders: [
    {
      id: "arm-circles",
      name: "Arm circles",
      how: "Arms out to the sides, draw small circles and let them grow, then reverse.",
      dose: "10 each direction",
      targets: ["shoulders", "chest"],
    },
    {
      id: "band-pull-aparts",
      name: "Band pull-aparts",
      how: "Hold a light band at shoulder height, pull it apart by squeezing your shoulder blades, return slowly.",
      dose: "12–15",
      targets: ["upper back", "rear shoulders"],
    },
    {
      id: "wall-slides",
      name: "Wall slides",
      how: "Back and arms against a wall in a goalpost shape, slide the arms up and down while keeping contact.",
      dose: "8–10",
      targets: ["shoulders", "upper back"],
    },
    {
      id: "band-external-rotations",
      name: "Band external rotations",
      how: "Elbow tucked at your side at 90°, rotate the forearm outward against a light band, return slowly.",
      dose: "12 each side",
      targets: ["rotator cuff"],
    },
  ],
  biceps: [
    {
      id: "arm-circles",
      name: "Arm circles",
      how: "Arms out to the sides, draw small circles and let them grow, then reverse.",
      dose: "10 each direction",
      targets: ["shoulders", "chest"],
    },
    {
      id: "wrist-circles",
      name: "Wrist circles",
      how: "Fingers interlaced, roll the wrists in slow circles both ways.",
      dose: "10 each direction",
      targets: ["wrists", "forearms"],
    },
    {
      id: "light-curls",
      name: "Light curls",
      how: "An empty bar or very light dumbbells, full range, controlled — this is a rehearsal, not a set.",
      dose: "12–15",
      targets: ["biceps", "forearms"],
    },
  ],
  triceps: [
    {
      id: "arm-circles",
      name: "Arm circles",
      how: "Arms out to the sides, draw small circles and let them grow, then reverse.",
      dose: "10 each direction",
      targets: ["shoulders", "chest"],
    },
    {
      id: "wrist-circles",
      name: "Wrist circles",
      how: "Fingers interlaced, roll the wrists in slow circles both ways.",
      dose: "10 each direction",
      targets: ["wrists", "forearms"],
    },
    {
      id: "band-pushdowns",
      name: "Light band pushdowns",
      how: "Elbows pinned at your sides, extend the arms against a light band and return slowly.",
      dose: "12–15",
      targets: ["triceps"],
    },
  ],
  legs: [
    {
      id: "leg-swings",
      name: "Leg swings",
      how: "Hold a wall or rack, swing one leg forward and back in a relaxed arc, then side to side.",
      dose: "10 each leg, each direction",
      targets: ["hips", "hamstrings"],
    },
    {
      id: "bodyweight-squats",
      name: "Bodyweight squats",
      how: "Feet shoulder-width, sit back and down as far as is comfortable, stand tall.",
      dose: "10–12",
      targets: ["quads", "glutes"],
    },
    {
      id: "walking-lunges",
      name: "Walking lunges",
      how: "Step forward into a lunge, both knees bent, push through the front foot into the next step.",
      dose: "8 each leg",
      targets: ["quads", "glutes", "hip flexors"],
    },
    {
      id: "glute-bridges",
      name: "Glute bridges",
      how: "On your back, knees bent, drive the hips up by squeezing the glutes, lower with control.",
      dose: "12",
      targets: ["glutes", "hamstrings"],
    },
  ],
  core: [
    {
      id: "cat-cow",
      name: "Cat–cow",
      how: "On all fours, round the back toward the ceiling, then let the belly drop and lift the chest. Move slowly with your breath.",
      dose: "8–10",
      targets: ["spine", "upper back"],
    },
    {
      id: "dead-bugs",
      name: "Dead bugs",
      how: "On your back, arms up, knees over hips; lower one arm and the opposite leg toward the floor while the lower back stays down.",
      dose: "8 each side",
      targets: ["core"],
    },
    {
      id: "bird-dogs",
      name: "Bird dogs",
      how: "On all fours, reach one arm forward and the opposite leg back, pause, return. Keep the hips level.",
      dose: "8 each side",
      targets: ["core", "lower back"],
    },
  ],
  full_body: [
    {
      id: "arm-circles",
      name: "Arm circles",
      how: "Arms out to the sides, draw small circles and let them grow, then reverse.",
      dose: "10 each direction",
      targets: ["shoulders", "chest"],
    },
    {
      id: "leg-swings",
      name: "Leg swings",
      how: "Hold a wall or rack, swing one leg forward and back in a relaxed arc, then side to side.",
      dose: "10 each leg, each direction",
      targets: ["hips", "hamstrings"],
    },
    {
      id: "bodyweight-squats",
      name: "Bodyweight squats",
      how: "Feet shoulder-width, sit back and down as far as is comfortable, stand tall.",
      dose: "10–12",
      targets: ["quads", "glutes"],
    },
    {
      id: "inchworms",
      name: "Inchworms",
      how: "Fold forward, walk the hands out to a plank, walk the feet back in, stand up.",
      dose: "6–8",
      targets: ["hamstrings", "shoulders", "core"],
    },
    {
      id: "cat-cow",
      name: "Cat–cow",
      how: "On all fours, round the back toward the ceiling, then let the belly drop and lift the chest. Move slowly with your breath.",
      dose: "8–10",
      targets: ["spine", "upper back"],
    },
  ],
  cardio: [
    {
      id: "leg-swings",
      name: "Leg swings",
      how: "Hold a wall or rack, swing one leg forward and back in a relaxed arc, then side to side.",
      dose: "10 each leg, each direction",
      targets: ["hips", "hamstrings"],
    },
    {
      id: "ankle-circles",
      name: "Ankle circles",
      how: "One foot off the floor, roll the ankle in slow circles both ways.",
      dose: "10 each direction, each foot",
      targets: ["ankles", "calves"],
    },
    {
      id: "bodyweight-squats",
      name: "Bodyweight squats",
      how: "Feet shoulder-width, sit back and down as far as is comfortable, stand tall.",
      dose: "10–12",
      targets: ["quads", "glutes"],
    },
  ],
};

const STATIC: Record<MuscleGroup, Movement[]> = {
  chest: [
    {
      id: "doorway-chest-stretch",
      name: "Doorway chest stretch",
      how: "Forearm on a door frame, elbow at shoulder height, step gently through until you feel the front of the shoulder and chest open.",
      dose: "Hold 20–30 s each side",
      targets: ["chest", "front of shoulders"],
    },
    {
      id: "cross-body-shoulder-stretch",
      name: "Cross-body shoulder stretch",
      how: "Bring one arm across the chest and hold it gently with the other, shoulders relaxed and down.",
      dose: "Hold 20–30 s each side",
      targets: ["rear shoulders"],
    },
    {
      id: "overhead-triceps-stretch",
      name: "Overhead triceps stretch",
      how: "Reach one arm overhead, bend the elbow so the hand drops behind the neck, and guide the elbow gently with the other hand.",
      dose: "Hold 20–30 s each side",
      targets: ["triceps", "lats"],
    },
  ],
  back: [
    {
      id: "childs-pose",
      name: "Child's pose",
      how: "Kneel, sit back toward the heels and reach the arms forward along the floor; let the back lengthen and breathe.",
      dose: "Hold 30 s",
      targets: ["lats", "lower back"],
    },
    {
      id: "lat-stretch",
      name: "Lat stretch at a rack",
      how: "Hold a rack or doorframe with one hand, sit the hips back and away until you feel the side of the back lengthen.",
      dose: "Hold 20–30 s each side",
      targets: ["lats"],
    },
    {
      id: "thread-the-needle",
      name: "Thread the needle",
      how: "On all fours, slide one arm under the body, palm up, resting the shoulder and ear on the floor.",
      dose: "Hold 20–30 s each side",
      targets: ["upper back", "rear shoulders"],
    },
    {
      id: "knees-to-chest",
      name: "Knees to chest",
      how: "On your back, hug both knees in gently and let the lower back relax into the floor.",
      dose: "Hold 20–30 s",
      targets: ["lower back"],
    },
  ],
  shoulders: [
    {
      id: "cross-body-shoulder-stretch",
      name: "Cross-body shoulder stretch",
      how: "Bring one arm across the chest and hold it gently with the other, shoulders relaxed and down.",
      dose: "Hold 20–30 s each side",
      targets: ["rear shoulders"],
    },
    {
      id: "doorway-chest-stretch",
      name: "Doorway chest stretch",
      how: "Forearm on a door frame, elbow at shoulder height, step gently through until you feel the front of the shoulder and chest open.",
      dose: "Hold 20–30 s each side",
      targets: ["chest", "front of shoulders"],
    },
    {
      id: "upper-trap-stretch",
      name: "Upper trap stretch",
      how: "Sitting tall, tilt one ear toward the shoulder and let the opposite arm hang heavy. Keep it gentle.",
      dose: "Hold 20–30 s each side",
      targets: ["neck", "upper traps"],
    },
  ],
  biceps: [
    {
      id: "wall-biceps-stretch",
      name: "Wall biceps stretch",
      how: "Palm flat on a wall behind you at shoulder height, fingers back; turn the body gently away until you feel the front of the upper arm.",
      dose: "Hold 20–30 s each side",
      targets: ["biceps", "front of shoulder"],
    },
    {
      id: "wrist-flexor-stretch",
      name: "Wrist flexor stretch",
      how: "Arm out, palm up, gently draw the fingers back with the other hand until the inside of the forearm stretches.",
      dose: "Hold 20–30 s each side",
      targets: ["forearms"],
    },
    {
      id: "wrist-extensor-stretch",
      name: "Wrist extensor stretch",
      how: "Arm out, palm down, gently press the back of the hand so the fingers point toward the floor.",
      dose: "Hold 20–30 s each side",
      targets: ["forearms"],
    },
  ],
  triceps: [
    {
      id: "overhead-triceps-stretch",
      name: "Overhead triceps stretch",
      how: "Reach one arm overhead, bend the elbow so the hand drops behind the neck, and guide the elbow gently with the other hand.",
      dose: "Hold 20–30 s each side",
      targets: ["triceps", "lats"],
    },
    {
      id: "wrist-extensor-stretch",
      name: "Wrist extensor stretch",
      how: "Arm out, palm down, gently press the back of the hand so the fingers point toward the floor.",
      dose: "Hold 20–30 s each side",
      targets: ["forearms"],
    },
    {
      id: "cross-body-shoulder-stretch",
      name: "Cross-body shoulder stretch",
      how: "Bring one arm across the chest and hold it gently with the other, shoulders relaxed and down.",
      dose: "Hold 20–30 s each side",
      targets: ["rear shoulders"],
    },
  ],
  legs: [
    {
      id: "standing-quad-stretch",
      name: "Standing quad stretch",
      how: "Hold a wall, bring one heel toward the glutes and hold the ankle; knees together, stand tall.",
      dose: "Hold 20–30 s each side",
      targets: ["quads", "hip flexors"],
    },
    {
      id: "hamstring-stretch",
      name: "Seated or standing hamstring stretch",
      how: "One leg straight, heel down, hinge forward from the hips with a flat back until the back of the thigh stretches.",
      dose: "Hold 20–30 s each side",
      targets: ["hamstrings"],
    },
    {
      id: "figure-four",
      name: "Figure-four glute stretch",
      how: "On your back, cross one ankle over the opposite knee and draw that thigh toward you.",
      dose: "Hold 20–30 s each side",
      targets: ["glutes", "hips"],
    },
    {
      id: "calf-stretch",
      name: "Wall calf stretch",
      how: "Hands on a wall, one leg back with the heel down and knee straight; lean in gently.",
      dose: "Hold 20–30 s each side",
      targets: ["calves"],
    },
  ],
  core: [
    {
      id: "childs-pose",
      name: "Child's pose",
      how: "Kneel, sit back toward the heels and reach the arms forward along the floor; let the back lengthen and breathe.",
      dose: "Hold 30 s",
      targets: ["lats", "lower back"],
    },
    {
      id: "knees-to-chest",
      name: "Knees to chest",
      how: "On your back, hug both knees in gently and let the lower back relax into the floor.",
      dose: "Hold 20–30 s",
      targets: ["lower back"],
    },
    {
      id: "supine-twist",
      name: "Lying twist",
      how: "On your back, knees bent, let both knees fall gently to one side while the shoulders stay down.",
      dose: "Hold 20–30 s each side",
      targets: ["obliques", "lower back"],
    },
  ],
  full_body: [
    {
      id: "childs-pose",
      name: "Child's pose",
      how: "Kneel, sit back toward the heels and reach the arms forward along the floor; let the back lengthen and breathe.",
      dose: "Hold 30 s",
      targets: ["lats", "lower back"],
    },
    {
      id: "doorway-chest-stretch",
      name: "Doorway chest stretch",
      how: "Forearm on a door frame, elbow at shoulder height, step gently through until you feel the front of the shoulder and chest open.",
      dose: "Hold 20–30 s each side",
      targets: ["chest", "front of shoulders"],
    },
    {
      id: "standing-quad-stretch",
      name: "Standing quad stretch",
      how: "Hold a wall, bring one heel toward the glutes and hold the ankle; knees together, stand tall.",
      dose: "Hold 20–30 s each side",
      targets: ["quads", "hip flexors"],
    },
    {
      id: "hamstring-stretch",
      name: "Seated or standing hamstring stretch",
      how: "One leg straight, heel down, hinge forward from the hips with a flat back until the back of the thigh stretches.",
      dose: "Hold 20–30 s each side",
      targets: ["hamstrings"],
    },
    {
      id: "figure-four",
      name: "Figure-four glute stretch",
      how: "On your back, cross one ankle over the opposite knee and draw that thigh toward you.",
      dose: "Hold 20–30 s each side",
      targets: ["glutes", "hips"],
    },
  ],
  cardio: [
    {
      id: "calf-stretch",
      name: "Wall calf stretch",
      how: "Hands on a wall, one leg back with the heel down and knee straight; lean in gently.",
      dose: "Hold 20–30 s each side",
      targets: ["calves"],
    },
    {
      id: "standing-quad-stretch",
      name: "Standing quad stretch",
      how: "Hold a wall, bring one heel toward the glutes and hold the ankle; knees together, stand tall.",
      dose: "Hold 20–30 s each side",
      targets: ["quads", "hip flexors"],
    },
    {
      id: "hamstring-stretch",
      name: "Seated or standing hamstring stretch",
      how: "One leg straight, heel down, hinge forward from the hips with a flat back until the back of the thigh stretches.",
      dose: "Hold 20–30 s each side",
      targets: ["hamstrings"],
    },
    {
      id: "hip-flexor-stretch",
      name: "Kneeling hip flexor stretch",
      how: "Half-kneeling, tuck the tailbone and shift the hips gently forward until the front of the back hip stretches.",
      dose: "Hold 20–30 s each side",
      targets: ["hip flexors"],
    },
  ],
};

/** A rest or unscheduled day: no workout is invented. The sequence doesn't apply, so the guide
 * offers an easy, general mobility and stretch set instead. */
function pick(table: Record<MuscleGroup, Movement[]>, ...ids: string[]): Movement[] {
  const all = Object.values(table).flat();
  return ids.map((id) => {
    const movement = all.find((m) => m.id === id);
    if (!movement) throw new Error(`Unknown rest-day movement: ${id}`);
    return movement;
  });
}
export const REST_DAY_DYNAMIC: Movement[] = pick(
  DYNAMIC,
  "arm-circles",
  "cat-cow",
  "leg-swings",
  "inchworms",
);
export const REST_DAY_STATIC: Movement[] = pick(
  STATIC,
  "childs-pose",
  "doorway-chest-stretch",
  "hamstring-stretch",
  "figure-four",
  "hip-flexor-stretch",
);

export type SessionGuide =
  | {
      kind: "workout";
      muscleGroups: MuscleGroup[];
      sequence: SessionStep[];
      dynamic: Movement[];
      static: Movement[];
    }
  | { kind: "rest"; dynamic: Movement[]; static: Movement[] };

/** Merges each group's lists in order, showing a movement once even when several of the day's
 * groups include it (back + biceps both start with arm circles). */
function merge(groups: MuscleGroup[], table: Record<MuscleGroup, Movement[]>): Movement[] {
  const seen = new Set<string>();
  const out: Movement[] = [];
  for (const group of groups) {
    for (const movement of table[group] ?? []) {
      if (seen.has(movement.id)) continue;
      seen.add(movement.id);
      out.push(movement);
    }
  }
  return out;
}

/** The guide for a day: the split's muscle groups (deduplicated across groups) or, with no
 * scheduled workout, the neutral rest-day set. */
export function buildSessionGuide(muscleGroups: MuscleGroup[] | null | undefined): SessionGuide {
  const groups = Array.from(new Set(muscleGroups ?? []));
  if (groups.length === 0) {
    return { kind: "rest", dynamic: REST_DAY_DYNAMIC, static: REST_DAY_STATIC };
  }
  return {
    kind: "workout",
    muscleGroups: groups,
    sequence: SESSION_SEQUENCE,
    dynamic: merge(groups, DYNAMIC),
    static: merge(groups, STATIC),
  };
}

/** Every movement in the catalog, for tests and the content documentation. */
export const ALL_MOVEMENTS = {
  dynamic: DYNAMIC,
  static: STATIC,
};
