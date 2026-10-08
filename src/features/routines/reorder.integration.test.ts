// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { asc, eq } from "drizzle-orm";
const url = process.env.INTEGRATION_DATABASE_URL;
if (url) process.env.DATABASE_URL = url;
const data = url ? await import("@/db/client") : null;
const schema = await import("@/db/schema");
const queries = url ? await import("./queries") : null;
let owner: string, other: string, routine: string, foreignRoutine: string, ids: string[];
describe.skipIf(!url)("atomic routine reorder (disposable Postgres)", () => {
  beforeEach(async () => {
    owner = randomUUID();
    other = randomUUID();
    routine = randomUUID();
    foreignRoutine = randomUUID();
    ids = [randomUUID(), randomUUID(), randomUUID()];
    await data!.db.insert(schema.users).values(
      [owner, other].map((id) => ({
        id,
        email: `${id}@reorder.test`,
        passwordHash: "test",
        displayName: "Test",
      })),
    );
    await data!.db.insert(schema.routines).values([
      { id: routine, userId: owner, name: "Morning" },
      { id: foreignRoutine, userId: other, name: "Foreign" },
    ]);
    await data!.db.insert(schema.routineItems).values(
      ids.map((id, sortOrder) => ({
        id,
        routineId: routine,
        name: `Step ${sortOrder}`,
        notes: "Keep",
        sortOrder,
      })),
    );
    await data!.db
      .insert(schema.routineCompletions)
      .values({ routineItemId: ids[0], completedOn: "2026-10-07", notes: "Historical note" });
  });
  afterEach(async () => {
    for (const id of [owner, other])
      await data!.db.delete(schema.users).where(eq(schema.users.id, id));
  });
  async function order() {
    return (
      await data!.db
        .select()
        .from(schema.routineItems)
        .where(eq(schema.routineItems.routineId, routine))
        .orderBy(asc(schema.routineItems.sortOrder))
    ).map((i) => i.id);
  }
  it("persists a multi-position move and preserves notes/completions", async () => {
    expect(await queries!.reorderRoutineItems(routine, owner, ids, [ids[2], ids[0], ids[1]])).toBe(
      true,
    );
    expect(await order()).toEqual([ids[2], ids[0], ids[1]]);
    const [completion] = await data!.db
      .select()
      .from(schema.routineCompletions)
      .where(eq(schema.routineCompletions.routineItemId, ids[0]));
    expect(completion.notes).toBe("Historical note");
    const rows = await data!.db
      .select()
      .from(schema.routineItems)
      .where(eq(schema.routineItems.routineId, routine));
    expect(rows.every((i) => i.notes === "Keep")).toBe(true);
  });
  it("rejects foreign owners, missing, duplicate, foreign and stale IDs without partial writes", async () => {
    for (const [user, expected, next] of [
      [other, ids, [...ids].reverse()],
      [owner, ids, [ids[0], ids[0], ids[2]]],
      [owner, ids, ids.slice(1)],
      [owner, ids, [ids[0], ids[1], randomUUID()]],
      [owner, [...ids].reverse(), ids],
    ] as [string, string[], string[]][]) {
      expect(await queries!.reorderRoutineItems(routine, user, expected, next)).toBe(false);
      expect(await order()).toEqual(ids);
    }
  });
  it("only applies one of two concurrent changes from the same snapshot", async () => {
    const results = await Promise.all([
      queries!.reorderRoutineItems(routine, owner, ids, [ids[1], ids[0], ids[2]]),
      queries!.reorderRoutineItems(routine, owner, ids, [ids[2], ids[0], ids[1]]),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });
});
