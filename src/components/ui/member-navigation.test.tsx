import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { MemberNavigation } from "./member-navigation";

const route = vi.hoisted(() => ({ path: "/today" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.path }));
beforeEach(() => {
  route.path = "/today";
});

it("highlights nested destinations and keeps one current-page link", () => {
  route.path = "/feedback/review";
  render(<MemberNavigation displayName="Member" owner logoutAction={async () => {}} />);
  fireEvent.click(screen.getByText("More"));
  expect(screen.getByRole("link", { name: "Review Feedback" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(screen.getByRole("link", { name: /^Feedback$/ })).not.toHaveAttribute("aria-current");
});

it("closes More with Escape and returns focus to its trigger", () => {
  render(<MemberNavigation displayName="Member" owner={false} logoutAction={async () => {}} />);
  const more = screen.getByText("More");
  fireEvent.click(more);
  const settings = screen.getByRole("link", { name: "Settings" });
  settings.focus();
  fireEvent.keyDown(settings, { key: "Escape" });
  expect(more.closest("details")).not.toHaveAttribute("open");
  expect(more).toHaveFocus();
  expect(screen.queryByText("Review Feedback")).not.toBeInTheDocument();
});
