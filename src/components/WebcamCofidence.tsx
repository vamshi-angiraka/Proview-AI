
import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Lightweight webcam panel that estimates a "presence/steadiness" cue
 * by sampling frames and measuring frame-to-frame brightness variance.
 * - High variance = lots of movement (lower steadiness)
 * - Low variance with reasonable brightness = engaged & steady (higher steadiness)
 * No external ML — runs fully in-browser, privacy-friendly.
 */
export function WebcamConfidence() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastSampleRef = useRef<Uint8ClampedArray | null>(null);
  const rafRef = useRef<number | null>(null);

  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steadiness, setSteadiness] = useState(0); // 0-100
  const [presence, setPresence] = useState(0); // 0-100 (avg brightness proxy)

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setEnabled(true);
      loop();
    } catch (e) {
      console.error(e);
      setError("Camera access denied");
      setEnabled(false);
    }
  };

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setEnabled(false);
    setSteadiness(0);
    setPresence(0);
    lastSampleRef.current = null;
  };

  const loop = () => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const sample = () => {
      try {
        if (v.readyState >= 2) {
          const W = 64, H = 48; // tiny grid for cheap analysis
          ctx.drawImage(v, 0, 0, W, H);
          const { data } = ctx.getImageData(0, 0, W, H);

          // Brightness proxy
          let sum = 0;
          for (let i = 0; i < data.length; i += 4) {
            sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
          }
          const avg = sum / (W * H);
          const presenceScore = Math.max(0, Math.min(100, ((avg - 25) / 200) * 100));
          setPresence(Math.round(presenceScore));

          // Movement: mean abs diff vs previous frame
          if (lastSampleRef.current && lastSampleRef.current.length === data.length) {
            let diff = 0;
            for (let i = 0; i < data.length; i += 4) {
              diff += Math.abs(data[i] - lastSampleRef.current[i]);
            }
            const meanDiff = diff / (W * H); // 0..255
            // Map: small motion = high steadiness
            const steady = Math.max(0, Math.min(100, 100 - meanDiff * 2.2));
            setSteadiness((prev) => Math.round(prev * 0.7 + steady * 0.3));
          }
          lastSampleRef.current = new Uint8ClampedArray(data);
        }
      } catch {
        // ignore transient draw errors
      }
      rafRef.current = window.setTimeout(() => {
        rafRef.current = requestAnimationFrame(sample);
      }, 250) as unknown as number;
    };
    sample();
  };

  useEffect(() => () => stop(), []);

  const tone = (v: number) =>
    v >= 70 ? "text-emerald-600" : v >= 40 ? "text-amber-600" : "text-rose-600";

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-soft">
      <div className="relative overflow-hidden rounded-xl bg-muted aspect-video">
        <video
          ref={videoRef}
          muted
          playsInline
          className={`h-full w-full object-cover ${enabled ? "" : "opacity-0"}`}
        />
        {!enabled && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground">
            <Camera className="h-6 w-6" />
            <p>Optional: enable your camera for confidence cues</p>
          </div>
        )}
        <canvas ref={canvasRef} width={64} height={48} className="hidden" />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="text-xs">
          <p className="font-medium">Live cues</p>
          <p className="text-muted-foreground">Stays on-device — never recorded.</p>
        </div>
        {enabled ? (
          <Button size="sm" variant="outline" onClick={stop}>
            <CameraOff className="mr-1.5 h-3.5 w-3.5" /> Stop
          </Button>
        ) : (
          <Button size="sm" onClick={start} className="bg-gradient-primary">
            <Camera className="mr-1.5 h-3.5 w-3.5" /> Enable camera
          </Button>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      {enabled && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-background p-2">
            <p className="text-muted-foreground">Presence</p>
            <p className={`text-lg font-bold ${tone(presence)}`}>{presence}</p>
          </div>
          <div className="rounded-lg bg-background p-2">
            <p className="text-muted-foreground">Steadiness</p>
            <p className={`text-lg font-bold ${tone(steadiness)}`}>{steadiness}</p>
          </div>
        </div>
      )}
    </div>
  );
}
