import { useCallback, useEffect, useRef, useState } from "react";

// Minimal typing for the Web Speech API (not in lib.dom by default in some envs)
type SR = any;

function getRecognitionCtor(): SR | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SR; webkitSpeechRecognition?: SR };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useSpeechRecognition() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SR | null>(null);
  const finalRef = useRef("");
  const onResultRef = useRef<((finalText: string) => void) | null>(null);

  useEffect(() => {
    const Ctor = getRecognitionCtor();
    setSupported(!!Ctor);
  }, []);

  const start = useCallback((onFinal?: (finalText: string) => void) => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }
    onResultRef.current = onFinal ?? null;
    finalRef.current = "";
    setInterim("");
    setError(null);

    const rec: SR = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (e: any) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const transcript = res[0]?.transcript ?? "";
        if (res.isFinal) {
          finalRef.current += (finalRef.current ? " " : "") + transcript.trim();
        } else {
          interimText += transcript;
        }
      }
      setInterim(interimText);
    };
    rec.onerror = (e: any) => {
      const code = e?.error || "unknown";
      if (code === "no-speech" || code === "aborted") return;
      setError(`Mic error: ${code}`);
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
      const finalText = finalRef.current.trim();
      if (finalText && onResultRef.current) onResultRef.current(finalText);
    };

    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch (err) {
      console.error(err);
      setError("Could not start microphone");
    }
  }, []);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => () => { try { recRef.current?.abort(); } catch { /* noop */ } }, []);

  return { supported, listening, interim, error, start, stop };
}
