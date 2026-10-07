// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ reorder: vi.fn(), session: vi.fn() }));
vi.mock("@/features/auth", () => ({ verifySession: mocks.session, parseMemberDay: vi.fn() }));
vi.mock("@/features/routines", () => ({ reorderRoutineItems: mocks.reorder }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { reorderRoutineItemsAction } from "./actions";
const id = "00000000-0000-4000-8000-000000000001";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({ userId: "owner" });
  mocks.reorder.mockResolvedValue(true);
});
describe("reorder action", () => {
  it("passes the authenticated identity and complete snapshot", async () => {
    expect(await reorderRoutineItemsAction(id, [id], [id])).toEqual({});
    expect(mocks.reorder).toHaveBeenCalledWith(id, "owner", [id], [id]);
  });
  it("rejects malformed IDs before writes", async () => {
    expect((await reorderRoutineItemsAction(id, ["bad"], [id])).error).toBeDefined();
    expect(mocks.reorder).not.toHaveBeenCalled();
  });
  it("reports stale snapshots and database failures", async () => {
    mocks.reorder.mockResolvedValue(false);
    expect((await reorderRoutineItemsAction(id, [id], [id])).error).toMatch(/changed/);
    mocks.reorder.mockRejectedValue(new Error("private db detail"));
    expect((await reorderRoutineItemsAction(id, [id], [id])).error).not.toContain("private");
  });
  it("requires authentication", async () => {
    mocks.session.mockRejectedValue(new Error("unauthorized"));
    await expect(reorderRoutineItemsAction(id, [id], [id])).rejects.toThrow("unauthorized");
    expect(mocks.reorder).not.toHaveBeenCalled();
  });
});
