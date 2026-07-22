"use client";

import { useRef, useState, useSyncExternalStore } from "react";

/** Minimal shape of the Web Speech API's SpeechRecognition, which isn't in TypeScript's lib. */
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult:
    | ((event: {
        resultIndex: number;
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      }) => void)
    | null;
  onerror: ((event: { error: string; message?: string }) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function subscribeToNothing() {
  return () => {};
}

function getIsSupportedSnapshot() {
  return getSpeechRecognitionConstructor() !== null;
}

function getServerIsSupportedSnapshot() {
  return false;
}

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "Microphone access was denied. Check your browser's site permissions.",
  "no-speech": "Didn't catch that — no speech detected.",
  network: "Speech recognition needs network access and couldn't reach the recognition service.",
  "audio-capture": "No microphone was found.",
  "service-not-allowed": "Speech recognition service isn't available in this browser/context.",
};

/** Wraps the browser's SpeechRecognition API. Unsupported browsers get `isSupported: false`. */
export function useSpeechToText(onTranscript: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSupported = useSyncExternalStore(
    subscribeToNothing,
    getIsSupportedSnapshot,
    getServerIsSupportedSnapshot,
  );
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  function toggleListening() {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) return;

    setError(null);
    const recognition = new SpeechRecognition();
    // continuous: keep listening across pauses/breaths instead of stopping after the first one.
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      // With continuous mode, only forward newly-finalized results (from resultIndex onward) —
      // event.results accumulates every result of the session, so re-sending it all each time
      // would duplicate already-appended text.
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i]?.[0]?.transcript;
        if (transcript) onTranscript(transcript);
      }
    };
    recognition.onerror = (event) => {
      console.error("SpeechRecognition error:", event.error, event.message);
      setError(ERROR_MESSAGES[event.error] ?? `Speech recognition error: ${event.error}`);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }

  return { isListening, isSupported, toggleListening, error };
}
