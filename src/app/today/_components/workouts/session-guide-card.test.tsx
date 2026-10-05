import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildSessionGuide } from "@/features/workouts/session-guide";
import { SessionGuideCard } from "./session-guide-card";

describe("SessionGuideCard", () => {
  it("starts collapsed, then shows the sequence and both movement lists for a workout day", () => {
    render(
      <SessionGuideCard guide={buildSessionGuide(["back", "biceps"])} dayLabel="Back & Bis" />,
    );
    const toggle = screen.getByRole("button", { name: /Warm-up & cooldown for Back & Bis/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Cardio warm-up")).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const steps = screen.getAllByRole("listitem").map((li) => li.textContent ?? "");
    const titles = [
      "Cardio warm-up",
      "Dynamic mobility",
      "Lifting",
      "Post-lifting cardio",
      "Cooldown stretching",
    ];
    const positions = titles.map((t) => steps.findIndex((s) => s.includes(t)));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(positions.every((p) => p >= 0)).toBe(true);

    expect(screen.getByText("Arm circles")).toBeInTheDocument();
    expect(screen.getByText("Thoracic rotations")).toBeInTheDocument();
    expect(screen.getByText("Wall biceps stretch")).toBeInTheDocument();
    expect(screen.getByText(/Dynamic mobility \(before lifting\)/)).toBeInTheDocument();
    expect(screen.getByText(/Cooldown stretches/)).toBeInTheDocument();
  });

  it("explains a rest day without inventing a workout", () => {
    render(<SessionGuideCard guide={buildSessionGuide(null)} dayLabel="" />);
    fireEvent.click(screen.getByRole("button", { name: /Rest day/ }));
    expect(screen.getByText(/No workout is scheduled for this day/)).toBeInTheDocument();
    expect(screen.queryByText("Cardio warm-up")).not.toBeInTheDocument();
    expect(screen.getByText("Child's pose")).toBeInTheDocument();
  });
});
