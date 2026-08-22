"use client";

import { useRef, useState, useTransition } from "react";
import { setDailyNoteAction, cleanUpNoteAction } from "@/app/daily-note/actions";
import { useSpeechToText } from "@/lib/hooks/use-speech-to-text";

function NoteEditor({ dayIso, initialNote }: { dayIso: string; initialNote: string }) {
  const [note, setNote] = useState(initialNote);
  const [savedNote, setSavedNote] = useState(initialNote);
  const [cleaningUp, startCleanUp] = useTransition();
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    isListening,
    isSupported: micSupported,
    toggleListening,
    error: micError,
  } = useSpeechToText((transcript) => {
    setNote((current) => (current ? `${current} ${transcript}` : transcript));
  });

  function scheduleSave(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startSaving(async () => {
        await setDailyNoteAction(dayIso, value);
        setSavedNote(value);
      });
    }, 600);
  }

  function handleChange(value: string) {
    setNote(value);
    setError(null);
    scheduleSave(value);
  }

  function handleCleanUp() {
    setError(null);
    startCleanUp(async () => {
      const result = await cleanUpNoteAction(note);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setNote(result.text);
      // Cleanup should save immediately rather than waiting on the debounce, since it's a
      // deliberate action, not incidental typing.
      if (debounceRef.current) clearTimeout(debounceRef.current);
      startSaving(async () => {
        await setDailyNoteAction(dayIso, result.text);
        setSavedNote(result.text);
      });
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border-2 border-accent bg-card p-4">
      <textarea
        value={note}
        onChange={(event) => handleChange(event.target.value)}
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
        <span className="text-xs text-muted-foreground">
          {saving ? "Saving..." : note !== savedNote ? "" : "Saved"}
        </span>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {micError && <p className="text-sm text-danger">{micError}</p>}
    </div>
  );
}

export function DailyNoteCard({ dayIso, note }: { dayIso: string; note: string }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="retro-heading text-lg font-semibold text-primary">Daily note</h2>
      {/* Keying on dayIso remounts on day navigation, same fix as the mission card — otherwise
          local textarea state would keep showing a previously-viewed day's note. */}
      <NoteEditor key={dayIso} dayIso={dayIso} initialNote={note} />
    </section>
  );
}
