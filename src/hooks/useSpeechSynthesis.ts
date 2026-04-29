import { useCallback, useEffect, useRef, useState } from "react";

export function useSpeechSynthesis() {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  const speak = useCallback((text: string) => {
    if (!supported || !text) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1;
      u.pitch = 1;
      u.lang = "en-US";
      // Try to pick a natural-sounding voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find((v) => /en[-_]US/i.test(v.lang) && /Google|Natural|Samantha|Aria/i.test(v.name))
        || voices.find((v) => /en[-_]US/i.test(v.lang))
        || voices[0];
      if (preferred) u.voice = preferred;
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      utterRef.current = u;
      setSpeaking(true);
      window.speechSynthesis.speak(u);
    } catch (e) {
      console.error(e);
      setSpeaking(false);
    }
  }, [supported]);

  const cancel = useCallback(() => {
    if (!supported) return;
    try { window.speechSynthesis.cancel(); } catch { /* noop */ }
    setSpeaking(false);
  }, [supported]);

  useEffect(() => () => { try { window.speechSynthesis?.cancel(); } catch { /* noop */ } }, []);

  return { supported, speaking, speak, cancel };
}
