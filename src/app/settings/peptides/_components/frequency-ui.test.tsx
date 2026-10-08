import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NewPeptideForm } from "./new-peptide-form";
import { PeptideSection } from "@/app/today/_components/peptides/peptide-section";
vi.mock("@/app/peptides/actions", () => ({
  createPeptideTemplateAction: vi.fn(),
  logPeptideDoseAction: vi.fn(),
  deletePeptideLogAction: vi.fn(),
}));
describe("weekday frequency controls", () => {
  it("offers Mon–Fri in the new-template picker", () => {
    render(<NewPeptideForm />);
    expect(screen.getByRole("option", { name: "Mon–Fri" })).toHaveValue("mon_fri");
  });
  it("still offers manual logging on Saturday", () => {
    render(
      <PeptideSection
        dayIso="2026-10-10"
        todayIso="2026-10-10"
        templates={[
          {
            id: "template",
            userId: "owner",
            name: "Example",
            doseAmount: 1,
            doseUnit: "mg",
            frequency: "mon_fri",
            preferredTime: null,
            vialAmountMg: null,
            bacWaterMl: null,
            halfLifeHours: null,
            archivedAt: null,
            createdAt: new Date(),
          },
        ]}
        logs={[]}
        mostRecentLogDates={{ template: "2026-10-09" }}
        currentLevelByTemplate={{}}
      />,
    );
    expect(screen.getByRole("button", { name: /Example.*Mon–Fri/ })).toBeEnabled();
  });
});
