import { describe, expect, it, vi } from "vitest";
import { repairReading } from "./repair.mjs";
const replacement = {
  id: "00000000-0000-4000-8000-000000000001",
  day: "2026-10-07",
  topic: "leadership",
  title: "Complete",
  body: "A complete practical sentence. ".repeat(200),
};
function fixture(changed = 1, ending = "Vague feedback like") {
  const calls: string[] = [];
  const row = { ...replacement, body: ending };
  const tx = vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
    void values;
    const write = strings[0].startsWith("UPDATE");
    calls.push(write ? "update" : "read");
    return write ? Array.from({ length: changed }, () => ({ id: row.id })) : [row];
  });
  const begin = vi.fn(async (...args: unknown[]) => {
    const fn = args.at(-1) as (query: typeof tx) => unknown;
    try {
      return await fn(tx);
    } catch (e) {
      calls.push("rollback");
      throw e;
    }
  });
  return { sql: { begin }, calls, tx };
}
describe("backup-first targeted reader repair", () => {
  it("defaults to read-only without backup or update", async () => {
    const f = fixture();
    const backup = vi.fn();
    expect((await repairReading(f.sql, replacement, { backup })).applied).toBe(false);
    expect(f.calls).toEqual(["read"]);
    expect(backup).not.toHaveBeenCalled();
  });
  it("backs up before updating the exact old body", async () => {
    const f = fixture();
    await repairReading(f.sql, replacement, {
      apply: true,
      backup: async () => {
        f.calls.push("backup");
        return "backup.dump";
      },
    });
    expect(f.calls).toEqual(["read", "backup", "update"]);
    expect(f.tx.mock.calls[1]).toContain("Vague feedback like");
  });
  it("never updates if backup fails", async () => {
    const f = fixture();
    await expect(
      repairReading(f.sql, replacement, {
        apply: true,
        backup: async () => {
          throw new Error("dump failed");
        },
      }),
    ).rejects.toThrow("dump failed");
    expect(f.calls).toEqual(["read"]);
  });
  it("rolls back if the selected article changed", async () => {
    const f = fixture(0);
    await expect(
      repairReading(f.sql, replacement, { apply: true, backup: async () => "backup" }),
    ).rejects.toThrow("rolled back");
    expect(f.calls).toEqual(["read", "update", "rollback"]);
  });
  it("rejects a different article ending or unfinished replacement", async () => {
    const f = fixture(1, "Complete existing article.");
    await expect(repairReading(f.sql, replacement, { backup: vi.fn() })).rejects.toThrow(
      "reported",
    );
    const g = fixture();
    await expect(
      repairReading(g.sql, { ...replacement, body: "Vague feedback like" }, { backup: vi.fn() }),
    ).rejects.toThrow("reviewed complete");
    expect(g.calls).toEqual([]);
  });
});
