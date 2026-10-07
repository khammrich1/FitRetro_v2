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

it("stays open when the trigger blurs with nowhere in particular, and closes on an outside press", () => {
  render(<MemberNavigation displayName="Member" owner={false} logoutAction={async () => {}} />);
  const more = screen.getByText("More");
  fireEvent.click(more);
  const details = more.closest("details")!;
  // Safari/Firefox blur the summary on mousedown inside the menu with relatedTarget null.
  fireEvent.blur(more, { relatedTarget: null });
  expect(details).toHaveAttribute("open");
  expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
  fireEvent.pointerDown(screen.getByRole("button", { name: "Log out" }));
  expect(details).toHaveAttribute("open");
  fireEvent.pointerDown(document.body);
  expect(details).not.toHaveAttribute("open");
});

it("closes More when focus moves to something outside it", () => {
  render(
    <>
      <MemberNavigation displayName="Member" owner={false} logoutAction={async () => {}} />
      <button type="button">Elsewhere</button>
    </>,
  );
  const more = screen.getByText("More");
  fireEvent.click(more);
  fireEvent.blur(more, { relatedTarget: screen.getByRole("button", { name: "Elsewhere" }) });
  expect(more.closest("details")).not.toHaveAttribute("open");
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
