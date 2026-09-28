// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";

const mocks = vi.hoisted(() => {
  class RedirectError extends Error {
    constructor(public readonly url: string) {
      super(`NEXT_REDIRECT ${url}`);
    }
  }
  return {
    RedirectError,
    jar: new Map<string, string>(),
    createGoal: vi.fn(),
    updateGoal: vi.fn(),
    getGoalForUser: vi.fn(),
    markGoalAchieved: vi.fn(),
    deleteGoal: vi.fn(),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      mocks.jar.has(name) ? { name, value: mocks.jar.get(name)! } : undefined,
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new mocks.RedirectError(url);
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
// Only the DB writes are faked; validation, date handling and the session check are real.
vi.mock("@/features/goals", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/goals")>()),
  createGoal: mocks.createGoal,
  updateGoal: mocks.updateGoal,
  getGoalForUser: mocks.getGoalForUser,
  markGoalAchieved: mocks.markGoalAchieved,
  deleteGoal: mocks.deleteGoal,
}));

const { createGoalAction, updateGoalAction, achieveGoalAction, deleteGoalAction } =
  await import("./actions");

const SESSION_SECRET = "test-session-secret-not-a-real-credential";
const USER_ID = "7a1c3f8e-0000-4000-8000-000000000001";
const GOAL_ID = "0f0e0d0c-0000-4000-8000-00000000abcd";

async function signIn() {
  const token = await new SignJWT({ userId: USER_ID })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(SESSION_SECRET));
  mocks.jar.set("session", token);
}

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

async function redirectTarget(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    if (error instanceof mocks.RedirectError) return error.url;
    throw error;
  }
  throw new Error("Expected a redirect.");
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-26T15:00:00"));
  vi.stubEnv("SESSION_SECRET", SESSION_SECRET);
  mocks.jar.clear();
  for (const fn of Object.values(mocks))
    if (typeof fn === "function" && "mockReset" in fn) fn.mockReset();
  mocks.updateGoal.mockResolvedValue(true);
  mocks.markGoalAchieved.mockResolvedValue(true);
  await signIn();
});

describe("createGoalAction", () => {
  it("saves a goal for the signed-in user", async () => {
    const result = await createGoalAction(undefined, form({ title: "Do a muscle up" }));
    expect(result).toMatchObject({ ok: "Goal added." });
    expect(mocks.createGoal).toHaveBeenCalledWith(USER_ID, {
      title: "Do a muscle up",
      notes: null,
      status: "active",
      startedOn: "2026-09-26",
      targetDate: null,
      achievedOn: null,
      achievedPrecision: null,
    });
  });

  it("logs an already-achieved milestone", async () => {
    const result = await createGoalAction(
      undefined,
      form({
        title: "Do a muscle up",
        achieved: "on",
        startedOn: "2026-01-01",
        achievedPrecision: "month",
        achievedMonth: "2026-03",
      }),
    );
    expect(result).toMatchObject({ ok: "Milestone logged. 🏆" });
    expect(mocks.createGoal.mock.calls[0][1]).toMatchObject({
      status: "achieved",
      achievedOn: "2026-03-01",
      achievedPrecision: "month",
    });
  });

  it("returns field errors and saves nothing", async () => {
    const result = await createGoalAction(undefined, form({ title: "" }));
    expect(result).toEqual({ errors: { title: ["Name your goal."] } });
    expect(mocks.createGoal).not.toHaveBeenCalled();
  });

  it("requires sign-in", async () => {
    mocks.jar.clear();
    expect(await redirectTarget(() => createGoalAction(undefined, form({ title: "x" })))).toBe(
      "/login",
    );
    expect(mocks.createGoal).not.toHaveBeenCalled();
  });
});

describe("updateGoalAction", () => {
  it("updates only within the signed-in user's goals", async () => {
    await updateGoalAction(GOAL_ID, undefined, form({ title: "Two muscle ups" }));
    expect(mocks.updateGoal).toHaveBeenCalledWith(
      GOAL_ID,
      USER_ID,
      expect.objectContaining({ title: "Two muscle ups" }),
    );
  });

  it("reports a goal that isn't theirs (or is gone) instead of pretending to save", async () => {
    mocks.updateGoal.mockResolvedValue(false);
    const result = await updateGoalAction(GOAL_ID, undefined, form({ title: "x" }));
    expect(result).toEqual({ error: "That goal no longer exists." });
  });

  it("rejects a malformed id without touching the DB", async () => {
    const result = await updateGoalAction("not-an-id", undefined, form({ title: "x" }));
    expect(result).toEqual({ error: "That goal no longer exists." });
    expect(mocks.updateGoal).not.toHaveBeenCalled();
  });
});

describe("achieveGoalAction", () => {
  const muscleUp = {
    id: GOAL_ID,
    userId: USER_ID,
    title: "Do a muscle up",
    status: "active",
    startedOn: "2026-01-01",
  };

  it("marks the goal achieved at the precision given", async () => {
    mocks.getGoalForUser.mockResolvedValue(muscleUp);
    const result = await achieveGoalAction(
      GOAL_ID,
      undefined,
      form({ achievedPrecision: "year", achievedYear: "2026" }),
    );
    expect(result).toMatchObject({ ok: "Milestone unlocked. 🏆" });
    expect(mocks.getGoalForUser).toHaveBeenCalledWith(GOAL_ID, USER_ID);
    expect(mocks.markGoalAchieved).toHaveBeenCalledWith(GOAL_ID, USER_ID, "2026-01-01", "year");
  });

  it("refuses a date before the goal started, or in the future", async () => {
    mocks.getGoalForUser.mockResolvedValue(muscleUp);
    const before = await achieveGoalAction(
      GOAL_ID,
      undefined,
      form({ achievedPrecision: "day", achievedDay: "2025-12-31" }),
    );
    expect(before).toEqual({ errors: { achieved: ["That's before you started this goal."] } });
    const future = await achieveGoalAction(
      GOAL_ID,
      undefined,
      form({ achievedPrecision: "day", achievedDay: "2026-09-27" }),
    );
    expect(future).toEqual({ errors: { achieved: ["That's in the future."] } });
    expect(mocks.markGoalAchieved).not.toHaveBeenCalled();
  });

  it("can't achieve someone else's goal", async () => {
    mocks.getGoalForUser.mockResolvedValue(null);
    const result = await achieveGoalAction(
      GOAL_ID,
      undefined,
      form({ achievedPrecision: "day", achievedDay: "2026-09-01" }),
    );
    expect(result).toEqual({ error: "That goal no longer exists." });
    expect(mocks.markGoalAchieved).not.toHaveBeenCalled();
  });
});

describe("deleteGoalAction", () => {
  it("deletes within the signed-in user's goals only", async () => {
    await deleteGoalAction(GOAL_ID);
    expect(mocks.deleteGoal).toHaveBeenCalledWith(GOAL_ID, USER_ID);
  });

  it("ignores malformed ids and requires sign-in", async () => {
    await deleteGoalAction("../x");
    expect(mocks.deleteGoal).not.toHaveBeenCalled();
    mocks.jar.clear();
    expect(await redirectTarget(() => deleteGoalAction(GOAL_ID))).toBe("/login");
  });
});
