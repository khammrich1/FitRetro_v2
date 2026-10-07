import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoutineTemplateCard } from "./routine-template-card";
import type { RoutineWithItems } from "@/features/routines";
const mocks = vi.hoisted(() => ({ reorder: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/app/routine/actions", () => ({
  reorderRoutineItemsAction: mocks.reorder,
  addRoutineItemAction: vi.fn(),
  updateRoutineItemAction: vi.fn(),
  deleteRoutineItemAction: vi.fn(),
  deleteRoutineAction: vi.fn(),
}));
const routine: RoutineWithItems = {
  id: "routine",
  userId: "owner",
  name: "Morning",
  createdAt: new Date(),
  items: ["Read", "Journal", "Walk"].map((name, i) => ({
    id: String(i),
    routineId: "routine",
    name,
    notes: `Note ${i}`,
    sortOrder: i,
    completedToday: i === 0,
    completionNotes: i === 0 ? "Done" : null,
  })),
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.reorder.mockResolvedValue({});
});
describe("routine reorder", () => {
  it("persists an accessible arrow reorder once and announces success", async () => {
    render(<RoutineTemplateCard routine={routine} />);
    fireEvent.click(screen.getByRole("button", { name: "Move Read down" }));
    await waitFor(() =>
      expect(screen.getByRole("status", { name: "Step order" })).toHaveTextContent("Saved"),
    );
    expect(mocks.reorder).toHaveBeenCalledExactlyOnceWith(
      "routine",
      ["0", "1", "2"],
      ["1", "0", "2"],
    );
    expect(screen.getByText("Note 0")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Drag Read to reorder" })).toBeInTheDocument();
  });
  it("restores the original order and refreshes authoritative data on failure", async () => {
    mocks.reorder.mockResolvedValue({ error: "Steps changed. Try again." });
    render(<RoutineTemplateCard routine={routine} />);
    fireEvent.click(screen.getByRole("button", { name: "Move Read down" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Steps changed"));
    expect(screen.getByRole("button", { name: "Move Read up" })).toBeDisabled();
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });
  it("blocks controls during a pending reorder", async () => {
    let finish!: (value: object) => void;
    mocks.reorder.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    render(<RoutineTemplateCard routine={routine} />);
    fireEvent.click(screen.getByRole("button", { name: "Move Read down" }));
    expect(screen.getByRole("button", { name: "Move Walk up" })).toBeDisabled();
    finish({});
    await waitFor(() =>
      expect(screen.getByRole("status", { name: "Step order" })).toHaveTextContent("Saved"),
    );
  });
});
