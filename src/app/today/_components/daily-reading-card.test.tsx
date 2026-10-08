import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
import { DailyReadingCard } from "./daily-reading-card";
describe("reader unavailable state", () => {
  it("shows a clear state and allows checking again without a client generation action", () => {
    render(<DailyReadingCard reading={null} expected />);
    expect(screen.getByRole("status")).toHaveTextContent("unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Check again" }));
    expect(refresh).toHaveBeenCalledOnce();
  });
  it("stays hidden for an unsubscribed member", () => {
    const { container } = render(<DailyReadingCard reading={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
