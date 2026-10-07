import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  setDailyNoteAction: vi.fn<(dayIso: string, note: string) => Promise<void>>(),
  cleanUpNoteAction: vi.fn(),
  /** The speech hook's transcript callback, captured so a test can "dictate". */
  transcript: null as null | ((text: string) => void),
}));

vi.mock("@/app/daily-note/actions", () => ({
  setDailyNoteAction: mocks.setDailyNoteAction,
  cleanUpNoteAction: mocks.cleanUpNoteAction,
}));
vi.mock("@/lib/hooks/use-speech-to-text", () => ({
  useSpeechToText: (onTranscript: (text: string) => void) => {
    mocks.transcript = onTranscript;
    return { isListening: false, isSupported: true, toggleListening: () => {}, error: null };
  },
}));

const { DailyNoteCard } = await import("./daily-note-card");

const DAY = "2026-10-04";

function openEditor(initialNote = "") {
  const view = render(<DailyNoteCard userId="member-a" dayIso={DAY} note={initialNote} />);
  fireEvent.click(screen.getByRole("button", { name: /Daily note/ }));
  return view;
}

beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear();
  mocks.setDailyNoteAction.mockReset().mockResolvedValue(undefined);
  mocks.cleanUpNoteAction.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("DailyNoteCard saving", () => {
  it("keeps the latest saved text when collapsed and reopened before new server props arrive", async () => {
    openEditor("server copy");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "new text" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    fireEvent.click(screen.getByRole("button", { name: /Daily note/ }));
    fireEvent.click(screen.getByRole("button", { name: /Daily note/ }));
    expect(screen.getByRole("textbox")).toHaveValue("new text");
  });
  it("follows a note that changed on the server while the editor was collapsed", async () => {
    const view = openEditor("A");
    fireEvent.click(screen.getByRole("button", { name: /Daily note/ })); // collapse
    await act(async () => {
      view.rerender(<DailyNoteCard userId="member-a" dayIso={DAY} note="B" />);
    });
    fireEvent.click(screen.getByRole("button", { name: /Daily note/ })); // expand
    expect(screen.getByRole("textbox")).toHaveValue("B");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "B and more" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    expect(mocks.setDailyNoteAction.mock.calls.map(([, text]) => text)).toEqual(["B and more"]);
  });

  it("keeps unsaved local edits over a server change, and still saves them", async () => {
    const view = openEditor("A");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "A typed" } });
    await act(async () => {
      view.rerender(<DailyNoteCard userId="member-a" dayIso={DAY} note="B" />);
    });
    expect(screen.getByRole("textbox")).toHaveValue("A typed");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    expect(mocks.setDailyNoteAction).toHaveBeenLastCalledWith(DAY, "A typed");
  });

  it("doesn't send the same text twice when collapsed and reopened mid-save", async () => {
    let release!: () => void;
    mocks.setDailyNoteAction
      .mockImplementationOnce(() => new Promise<void>((resolve) => (release = resolve)))
      .mockResolvedValue(undefined);
    openEditor("");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "hello" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    fireEvent.click(screen.getByRole("button", { name: /Daily note/ }));
    fireEvent.click(screen.getByRole("button", { name: /Daily note/ }));
    await act(async () => {
      release();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(mocks.setDailyNoteAction.mock.calls.map(([, text]) => text)).toEqual(["hello"]);
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
  });

  it("does not load or save another member's draft on a shared browser", async () => {
    sessionStorage.setItem(`daily-note:draft:member-b:${DAY}`, "private note from B");
    sessionStorage.setItem(`daily-note:draft:${DAY}`, "unattributed legacy note");
    openEditor("A's server note");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    expect(screen.getByRole("textbox")).toHaveValue("A's server note");
    expect(mocks.setDailyNoteAction).not.toHaveBeenCalled();
  });

  it("cancels an unsent edit when it is undone to the saved text", async () => {
    openEditor("original");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "temporary" } });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "original" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    expect(mocks.setDailyNoteAction).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
  });

  it("queues an undo behind an already running save", async () => {
    let release!: () => void;
    mocks.setDailyNoteAction
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            release = resolve;
          }),
      )
      .mockResolvedValue(undefined);
    openEditor("original");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "temporary" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "original" } });
    await act(async () => {
      release();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(mocks.setDailyNoteAction.mock.calls.map(([, text]) => text)).toEqual([
      "temporary",
      "original",
    ]);
  });

  it("offers an explicit retry without requiring another edit", async () => {
    mocks.setDailyNoteAction.mockRejectedValueOnce(new Error("offline"));
    openEditor();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "keep this" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Retry save" }));
    });
    expect(mocks.setDailyNoteAction).toHaveBeenLastCalledWith(DAY, "keep this");
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
  });
  it("saves dictated text, not just typed text", async () => {
    openEditor("");
    await act(async () => {
      mocks.transcript!("Great session today");
      await vi.advanceTimersByTimeAsync(700);
    });
    expect(mocks.setDailyNoteAction).toHaveBeenCalledWith(DAY, "Great session today");
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
  });

  it("appends dictation to what's already typed, and saves the combined note", async () => {
    openEditor("");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Legs." } });
    await act(async () => {
      mocks.transcript!("Felt strong.");
      await vi.advanceTimersByTimeAsync(700);
    });
    expect(screen.getByRole("textbox")).toHaveValue("Legs. Felt strong.");
    expect(mocks.setDailyNoteAction).toHaveBeenLastCalledWith(DAY, "Legs. Felt strong.");
  });

  it("flushes an unsaved note when the editor is collapsed before the debounce fires", async () => {
    openEditor("");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "typed then closed" } });
    // Collapse immediately — well inside the 600ms debounce.
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Daily note/ }));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(mocks.setDailyNoteAction).toHaveBeenCalledWith(DAY, "typed then closed");
  });

  it("never lets an older save land after a newer one", async () => {
    // First save hangs; a second edit arrives meanwhile. The second must wait and win.
    let releaseFirst!: () => void;
    mocks.setDailyNoteAction
      .mockImplementationOnce(() => new Promise<void>((resolve) => (releaseFirst = resolve)))
      .mockResolvedValue(undefined);
    openEditor("");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "first" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "first second" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    expect(mocks.setDailyNoteAction).toHaveBeenCalledTimes(1);
    // The newer text is waiting its turn — not saved, and not pretending to be.
    expect(screen.getByRole("status")).toHaveTextContent(/Unsaved changes|Saving/);
    await act(async () => {
      releaseFirst();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(mocks.setDailyNoteAction.mock.calls.map(([, text]) => text)).toEqual([
      "first",
      "first second",
    ]);
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
  });

  it("keeps the text and says so when a save fails", async () => {
    mocks.setDailyNoteAction.mockRejectedValueOnce(new Error("offline"));
    openEditor("");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "don't lose me" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    expect(screen.getByRole("textbox")).toHaveValue("don't lose me");
    expect(screen.getByText(/Couldn't save your note/)).toBeInTheDocument();
    expect(sessionStorage.getItem(`daily-note:draft:member-a:${DAY}`)).toBe("don't lose me");
  });

  it("restores and saves a draft left behind by a closed tab", async () => {
    sessionStorage.setItem(`daily-note:draft:member-a:${DAY}`, "left behind");
    openEditor("server copy");
    expect(screen.getByRole("textbox")).toHaveValue("left behind");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(mocks.setDailyNoteAction).toHaveBeenCalledWith(DAY, "left behind");
  });

  it("doesn't apply an AI cleanup over text that changed while it was running", async () => {
    let resolveCleanup!: (value: { text: string }) => void;
    mocks.cleanUpNoteAction.mockImplementation(
      () => new Promise((resolve) => (resolveCleanup = resolve)),
    );
    openEditor("rough note");
    fireEvent.click(screen.getByRole("button", { name: "Clean up" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "rough note plus more" } });
    await act(async () => {
      resolveCleanup({ text: "Rough note." });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByRole("textbox")).toHaveValue("rough note plus more");
    expect(screen.getByText(/changed while it was being cleaned up/)).toBeInTheDocument();
  });
});
