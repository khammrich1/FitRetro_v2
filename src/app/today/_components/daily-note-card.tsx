"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { setDailyNoteAction, cleanUpNoteAction } from "@/app/daily-note/actions";
import { useSpeechToText } from "@/lib/hooks/use-speech-to-text";

const SAVE_DEBOUNCE_MS = 600;

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

/** Unsaved text survives a collapse, a day change or a closed tab via sessionStorage: the editor
 * restores and saves it on its next mount. Per day, per tab, and cleared once saved. */
function draftKey(dayIso: string) {
  return `daily-note:draft:${dayIso}`;
}
function readDraft(dayIso: string): string | null {
  try {
    return sessionStorage.getItem(draftKey(dayIso));
  } catch {
    return null;
  }
}
function writeDraft(dayIso: string, text: string | null) {
  try {
    if (text === null) sessionStorage.removeItem(draftKey(dayIso));
    else sessionStorage.setItem(draftKey(dayIso), text);
  } catch {
    // Storage unavailable (private mode etc.) — saving still works, just without the safety net.
  }
}

function NoteEditor({ dayIso, initialNote }: { dayIso: string; initialNote: string }) {
  // Only ever mounted client-side (after the card is expanded), so reading the draft here is safe.
  const [note, setNote] = useState(() => readDraft(dayIso) ?? initialNote);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [cleaningUp, startCleanUp] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Everything the save pipeline needs lives in refs so speech callbacks, the debounce timer and
  // the unmount flush all see the latest text without stale closures.
  const noteRef = useRef(note);
  const savedRef = useRef(initialNote);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const queuedRef = useRef<string | null>(null);

  // One request in flight at a time, the newest text waiting behind it. That keeps saves in order
  // (an older save can never land after a newer one) and never drops the latest text; a failure
  // keeps the text queued and tells the user instead of silently losing it.
  const runSaves = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      while (queuedRef.current !== null) {
        const value = queuedRef.current;
        queuedRef.current = null;
        setStatus("saving");
        try {
          await setDailyNoteAction(dayIso, value);
          savedRef.current = value;
          if (queuedRef.current === null && noteRef.current === value) {
            writeDraft(dayIso, null);
            setStatus("saved");
          }
        } catch {
          queuedRef.current ??= value;
          setStatus("error");
          setError("Couldn't save your note — check your connection. Your text is still here.");
          break;
        }
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [dayIso]);

  function saveNow(value: string) {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    queuedRef.current = value;
    void runSaves();
  }

  /** Every change — typed, dictated or cleaned up — goes through here, so every change is saved. */
  function applyChange(value: string, { immediate = false } = {}) {
    noteRef.current = value;
    setNote(value);
    setError(null);
    writeDraft(dayIso, value);
    if (value === savedRef.current) {
      setStatus("saved");
      return;
    }
    setStatus("dirty");
    if (immediate) {
      saveNow(value);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      queuedRef.current = value;
      void runSaves();
    }, SAVE_DEBOUNCE_MS);
  }

  const {
    isListening,
    isSupported: micSupported,
    toggleListening,
    error: micError,
  } = useSpeechToText((transcript) => {
    const current = noteRef.current;
    applyChange(current ? `${current} ${transcript}` : transcript);
  });

  // A restored draft is unsaved by definition; send it as soon as the editor opens.
  useEffect(() => {
    if (noteRef.current !== savedRef.current) {
      queuedRef.current = noteRef.current;
      void runSaves();
    }
    // Flush on unmount (collapse, day navigation, leaving the page): anything still waiting on
    // the debounce is sent immediately rather than lost. The draft stays in storage until the
    // save confirms.
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (noteRef.current !== savedRef.current) {
        queuedRef.current = noteRef.current;
        void runSaves();
      }
    };
  }, [runSaves]);

  function handleCleanUp() {
    setError(null);
    const before = noteRef.current;
    startCleanUp(async () => {
      const result = await cleanUpNoteAction(before);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      // Don't clobber anything typed or dictated while the request was out.
      if (noteRef.current !== before) {
        setError(
          "The note changed while it was being cleaned up, so the cleaned version wasn't applied — tap Clean up again.",
        );
        return;
      }
      applyChange(result.text, { immediate: true });
    });
  }

  const statusText =
    status === "saving"
      ? "Saving..."
      : status === "saved"
        ? "Saved"
        : status === "dirty"
          ? "Unsaved changes"
          : status === "error"
            ? "Not saved"
            : "";

  return (
    <div className="flex flex-col gap-2 rounded-lg border-2 border-accent bg-card p-4">
      <textarea
        value={note}
        onChange={(event) => applyChange(event.target.value)}
        placeholder="How'd today go? Type it or dictate it, then clean it up if it's rough."
        rows={4}
        className="rounded-md border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <div className="flex flex-wrap items-center gap-2">
        {micSupported && (
          <button
            type="button"
            onClick={toggleListening}
            aria-pressed={isListening}
            title={isListening ? "Stop listening" : "Dictate your note"}
            className={`rounded-md border px-3 py-1 text-sm ${
              isListening
                ? "border-danger text-danger"
                : "border-border hover:border-accent hover:text-accent"
            }`}
          >
            {isListening ? "● Listening" : "🎤"}
          </button>
        )}
        <button
          type="button"
          onClick={handleCleanUp}
          disabled={cleaningUp || !note.trim()}
          className="rounded-full border border-border px-4 py-1.5 text-sm hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {cleaningUp ? "Cleaning up..." : "Clean up"}
        </button>
        <span
          role="status"
          className={`text-xs ${status === "error" ? "text-danger" : "text-muted-foreground"}`}
        >
          {statusText}
        </span>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {micError && <p className="text-sm text-danger">{micError}</p>}
    </div>
  );
}

export function DailyNoteCard({ dayIso, note }: { dayIso: string; note: string }) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = note.trim();
  const preview = trimmed
    ? trimmed.length > 40
      ? `${trimmed.slice(0, 40)}…`
      : trimmed
    : "No note yet";

  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm hover:border-accent"
      >
        <span className="min-w-0 flex-1 truncate text-left">
          <span className="font-medium text-foreground">Daily note</span>{" "}
          <span className="text-muted-foreground">— {preview}</span>
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">{expanded ? "▲" : "▼"}</span>
      </button>
      {/* Keying on dayIso remounts on day navigation, same fix as the mission card — otherwise
          local textarea state would keep showing a previously-viewed day's note. */}
      {expanded && <NoteEditor key={dayIso} dayIso={dayIso} initialNote={note} />}
    </section>
  );
}
