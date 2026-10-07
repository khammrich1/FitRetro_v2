import { beforeEach, describe, expect, it, vi } from "vitest";
import { peptideFrequencyEnum } from "@/db/schema";
import { peptideFrequencyLabel } from "@/features/peptides/frequency";
const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), session: vi.fn() }));
vi.mock("@/features/auth", () => ({ verifySession: mocks.session, getMemberToday: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/peptides", () => ({
  createPeptideTemplate: mocks.create,
  updatePeptideTemplate: mocks.update,
}));
import { createPeptideTemplateAction, updatePeptideTemplateAction } from "./actions";
function form(frequency: string) {
  const data = new FormData();
  Object.entries({
    name: "Example",
    doseAmount: "1",
    doseUnit: "mg",
    frequency,
    preferredTime: "",
    vialAmountMg: "",
    bacWaterMl: "",
    halfLifeHours: "",
  }).forEach(([k, v]) => data.set(k, v));
  return data;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({ userId: "owner" });
});
describe("peptide frequency", () => {
  it.each(peptideFrequencyEnum.enumValues)(
    "accepts %s for create and edit with the authenticated owner",
    async (frequency) => {
      expect(await createPeptideTemplateAction(undefined, form(frequency))).toBeUndefined();
      expect(await updatePeptideTemplateAction("template", form(frequency))).toBeUndefined();
      expect(mocks.create).toHaveBeenCalledWith("owner", expect.objectContaining({ frequency }));
      expect(mocks.update).toHaveBeenCalledWith(
        "template",
        "owner",
        expect.objectContaining({ frequency }),
      );
    },
  );
  it("rejects an invalid frequency before any write", async () => {
    expect(
      (await createPeptideTemplateAction(undefined, form("weekends")))?.errors?.frequency,
    ).toBeDefined();
    expect(
      (await updatePeptideTemplateAction("template", form("weekends")))?.errors?.frequency,
    ).toBeDefined();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("does not write without a valid session", async () => {
    mocks.session.mockRejectedValue(new Error("unauthorized"));
    await expect(createPeptideTemplateAction(undefined, form("mon_fri"))).rejects.toThrow(
      "unauthorized",
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("uses the same readable weekday label", () =>
    expect(peptideFrequencyLabel("mon_fri")).toBe("Mon–Fri"));
});
