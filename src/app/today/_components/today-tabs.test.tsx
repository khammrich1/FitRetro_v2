import { act, fireEvent, render, screen } from "@testing-library/react";
import { useEffect, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TodayTabs } from "./today-tabs";

function Draft() {
  const [value, setValue] = useState("");
  return (
    <input
      aria-label="Meal draft"
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  );
}
function view(dayIso = "2026-10-04") {
  return (
    <TodayTabs
      dayIso={dayIso}
      nutrition={<Draft />}
      move={<p>Training panel</p>}
      routine={<p>Ritual panel</p>}
    />
  );
}
beforeEach(() => {
  sessionStorage.clear();
});

describe("daily tracking tabs", () => {
  it("preserves a draft across tab switches but resets it on a different day", async () => {
    const rendered = render(view());
    fireEvent.click(screen.getByRole("tab", { name: /Nutrition/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "Meal draft" }), {
      target: { value: "Lunch in progress" },
    });
    fireEvent.click(screen.getByRole("tab", { name: /Move/ }));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /Nutrition/ }));
    expect(screen.getByRole("textbox")).toHaveValue("Lunch in progress");
    await act(async () => {
      rendered.rerender(view("2026-10-05"));
    });
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("mounts a panel the first time it's opened and keeps it after switching away", () => {
    render(view());
    expect(screen.queryByText("Ritual panel")).not.toBeInTheDocument();
    expect(screen.queryByText("Training panel")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /Routine/ }));
    expect(screen.getByText("Ritual panel")).toBeVisible();
    fireEvent.click(screen.getByRole("tab", { name: /Nutrition/ }));
    // Still mounted (hidden) so its state survives; Move was never opened, so it never mounted.
    expect(screen.getByText("Ritual panel")).not.toBeVisible();
    expect(screen.queryByText("Training panel")).not.toBeInTheDocument();
  });

  it("supports roving focus, wrapping arrows, Home and End", () => {
    render(view());
    const nutrition = screen.getByRole("tab", { name: /Nutrition/ });
    const move = screen.getByRole("tab", { name: /Move/ });
    const routine = screen.getByRole("tab", { name: /Routine/ });
    fireEvent.click(nutrition);
    fireEvent.keyDown(nutrition, { key: "ArrowLeft" });
    expect(routine).toHaveFocus();
    expect(routine).toHaveAttribute("aria-selected", "true");
    expect(nutrition).toHaveAttribute("tabindex", "-1");
    fireEvent.keyDown(routine, { key: "Home" });
    expect(nutrition).toHaveFocus();
    fireEvent.keyDown(nutrition, { key: "ArrowRight" });
    expect(move).toHaveFocus();
    fireEvent.keyDown(move, { key: "End" });
    expect(routine).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveAttribute(
      "id",
      routine.getAttribute("aria-controls"),
    );
  });

  it("cleans up effects while a panel is hidden, then restores them", async () => {
    const cleanup = vi.fn();
    const start = vi.fn();
    function ListeningPanel() {
      useEffect(() => {
        start();
        return cleanup;
      }, []);
      return <p>Listening panel</p>;
    }
    render(
      <TodayTabs
        dayIso="2026-10-04"
        nutrition={<ListeningPanel />}
        move={<p>Move</p>}
        routine={<p>Routine</p>}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: /Nutrition/ }));
    cleanup.mockClear();
    fireEvent.click(screen.getByRole("tab", { name: /Move/ }));
    expect(cleanup).toHaveBeenCalledTimes(1);
    const starts = start.mock.calls.length;
    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: /Nutrition/ }));
    });
    expect(start.mock.calls.length).toBe(starts + 1);
  });
});
