import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Mic,
  MicOff,
  Sparkles,
  Send,
  Bot,
  User,
  Trophy,
  RefreshCw,
  CheckCircle2,
  Lightbulb,
  ArrowRight,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { WebcamConfidence } from "@/components/WebcamConfidence";

export const Route = createFileRoute("/_app/interview")({
  head: () => ({ meta: [{ title: "AI Interview — ProView AI" }] }),
  component: InterviewPage,
});

type Msg = { role: "user" | "assistant"; content: string };

type Feedback = {
  overall_score: number;
  communication_score: number;
  technical_score: number;
  confidence_score: number;
  keyword_relevance_score?: number;
  clarity_score?: number;
  matched_keywords?: string[];
  missing_keywords?: string[];
  summary: string;
  strengths: string[];
  improvements: string[];
  next_steps: string[];
};

const SUGGESTED_ROLES = [
  "Frontend Developer",
  "Backend Developer",
  "Full-Stack Engineer",
  "Data Analyst",
  "Product Manager",
];

function InterviewPage() {
  const { user } = useAuth();
  const [stage, setStage] = useState<"setup" | "chat" | "report">("setup");
  const [role, setRole] = useState("Frontend Developer");
  const [careerGoal, setCareerGoal] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const speech = useSpeechRecognition();
  const tts = useSpeechSynthesis();
  const [voiceOn, setVoiceOn] = useState(true);
  const [voiceMode, setVoiceMode] = useState(false);
  const lastSpokenRef = useRef<string>("");
  const messagesRef = useRef<Msg[]>([]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Speak the latest assistant message when streaming finishes
  useEffect(() => {
    if (!voiceOn || streaming) return;
    const last = messages[messages.length - 1];
    if (last && last.role === "assistant" && last.content && last.content !== lastSpokenRef.current) {
      lastSpokenRef.current = last.content;
      tts.speak(last.content);
    }
  }, [messages, streaming, voiceOn, tts]);

  // Voice mode loop: after assistant finishes (and TTS done if on), auto-start mic.
  useEffect(() => {
    if (!voiceMode || stage !== "chat" || streaming) return;
    if (voiceOn && tts.speaking) return;
    if (speech.listening) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    const t = setTimeout(() => {
      if (!speech.supported) return;
      speech.start((finalText) => {
        const text = finalText.trim();
        if (!text) return;
        const userMsg: Msg = { role: "user", content: text };
        const next = [...messagesRef.current, userMsg];
        setMessages(next);
        setInput("");
        void streamChat(next);
      });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceMode, stage, streaming, tts.speaking, voiceOn, messages, speech.listening, speech.supported]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("career_goal")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.career_goal) setCareerGoal(data.career_goal as string);
      });
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const startInterview = async () => {
    if (!user) return;
    if (!role.trim()) {
      toast.error("Please pick a role");
      return;
    }
    const { data, error } = await supabase
      .from("interview_sessions")
      .insert({ user_id: user.id, role, status: "in_progress", transcript: [] })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setSessionId(data.id as string);
    setMessages([]);
    setStage("chat");
    // Kick off the first AI message
    void streamChat([], true);
  };

  const streamChat = async (currentMessages: Msg[], firstTurn = false) => {
    setStreaming(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/interview-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: firstTurn
              ? [{ role: "user", content: "Please begin the interview." }]
              : currentMessages,
            role,
            careerGoal,
          }),
        },
      );

      if (res.status === 429) {
        toast.error("Too many requests. Please wait a moment.");
        setStreaming(false);
        return;
      }
      if (res.status === 402) {
        toast.error("AI credits exhausted. Add credits in Lovable Cloud settings.");
        setStreaming(false);
        return;
      }
      if (!res.ok || !res.body) {
        toast.error("Interviewer is unavailable. Try again.");
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantSoFar = "";
      let started = false;
      let streamDone = false;

      const upsertAssistant = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          if (!started) {
            started = true;
            return [...prev, { role: "assistant", content: assistantSoFar }];
          }
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m,
          );
        });
      };

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, nl);
          textBuffer = textBuffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Persist transcript
      if (sessionId && assistantSoFar) {
        const finalMessages: Msg[] = firstTurn
          ? [{ role: "assistant", content: assistantSoFar }]
          : [...currentMessages, { role: "assistant", content: assistantSoFar }];
        await supabase
          .from("interview_sessions")
          .update({ transcript: finalMessages })
          .eq("id", sessionId);
      }
    } catch (e) {
      console.error(e);
      toast.error("Something went wrong. Try again.");
    } finally {
      setStreaming(false);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    if (speech.listening) speech.stop();
    tts.cancel();
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    await streamChat(next);
  };

  const toggleMic = () => {
    if (!speech.supported) {
      toast.error("Voice input isn't supported in this browser. Try Chrome or Edge.");
      return;
    }
    if (speech.listening) {
      speech.stop();
      return;
    }
    tts.cancel();
    speech.start((finalText) => {
      setInput((prev) => (prev ? prev + " " : "") + finalText);
    });
  };

  const finishInterview = async () => {
    if (!sessionId || messages.length < 2) {
      toast.error("Answer at least one question first.");
      return;
    }
    setSubmittingFeedback(true);
    setVoiceMode(false);
    if (speech.listening) speech.stop();
    tts.cancel();
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/interview-feedback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages, role }),
        },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error || "Couldn't generate feedback.");
        return;
      }
      const { feedback: fb } = (await res.json()) as { feedback: Feedback };
      setFeedback(fb);
      setStage("report");

      await supabase
        .from("interview_sessions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          feedback: fb,
          overall_score: fb.overall_score,
          communication_score: fb.communication_score,
          technical_score: fb.technical_score,
          confidence_score: fb.confidence_score,
          transcript: messages,
        })
        .eq("id", sessionId);
    } catch (e) {
      console.error(e);
      toast.error("Something went wrong generating feedback.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const restart = () => {
    setStage("setup");
    setMessages([]);
    setFeedback(null);
    setSessionId(null);
  };

  // ===== SETUP =====
  if (stage === "setup") {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="text-center">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-4 py-1.5 text-xs font-medium shadow-soft">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> Round 2
          </div>
          <h1 className="text-3xl font-bold sm:text-4xl">
            AI <span className="text-gradient">Mock Interview</span>
          </h1>
          <p className="mt-3 text-muted-foreground">
            Practice with an adaptive interviewer. You'll get a personalized feedback report at the end.
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-border/60 bg-card p-8 shadow-soft">
          <Label htmlFor="role">Target role</Label>
          <Input
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Frontend Developer"
            className="mt-2"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTED_ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-smooth ${
                  role === r
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background hover:border-primary/40"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="mt-6">
            <Label htmlFor="goal">Career goal (optional)</Label>
            <Textarea
              id="goal"
              value={careerGoal}
              onChange={(e) => setCareerGoal(e.target.value)}
              placeholder="Anything you'd like the interviewer to keep in mind"
              rows={3}
              className="mt-2"
            />
          </div>

          <Button
            onClick={startInterview}
            className="mt-8 w-full bg-gradient-primary shadow-soft hover:shadow-elegant"
            size="lg"
          >
            <Mic className="mr-2 h-4 w-4" /> Start interview
          </Button>
        </div>
      </div>
    );
  }

  // ===== CHAT =====
  if (stage === "chat") {
    return (
      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_300px]">
        <div className="flex h-[calc(100vh-180px)] flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Interviewing for</p>
              <p className="font-semibold">{role}</p>
            </div>
            <div className="flex items-center gap-2">
              {speech.supported && (
                <Button
                  variant={voiceMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    const next = !voiceMode;
                    setVoiceMode(next);
                    if (!next && speech.listening) speech.stop();
                    if (next) toast.success("Voice mode on — just speak your answers.");
                  }}
                  className={voiceMode ? "bg-gradient-primary" : ""}
                  title="Hands-free voice interview"
                >
                  <Mic className="mr-1.5 h-4 w-4" />
                  {voiceMode ? "Voice mode: ON" : "Voice mode"}
                </Button>
              )}
              {tts.supported && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (tts.speaking) tts.cancel();
                    setVoiceOn((v) => !v);
                  }}
                  title={voiceOn ? "Mute interviewer voice" : "Unmute interviewer voice"}
                >
                  {voiceOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={finishInterview}
                disabled={submittingFeedback || streaming || messages.length < 2}
              >
                {submittingFeedback ? "Scoring..." : "Finish & get feedback"}
              </Button>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="mt-4 flex-1 space-y-4 overflow-y-auto rounded-2xl border border-border/60 bg-card/60 p-5 shadow-soft"
          >
            {messages.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                Interviewer is preparing your first question...
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`flex h-8 w-8 flex-none items-center justify-center rounded-full ${
                    m.role === "assistant"
                      ? "bg-gradient-primary text-primary-foreground"
                      : "bg-accent/20 text-accent-foreground"
                  }`}
                >
                  {m.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-soft ${
                    m.role === "assistant"
                      ? "bg-background"
                      : "bg-gradient-primary text-primary-foreground"
                  }`}
                >
                  {m.content || "..."}
                </div>
              </div>
            ))}
          </div>

          {speech.listening && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5 text-xs text-primary">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Listening… {speech.interim && <span className="italic text-muted-foreground">"{speech.interim}"</span>}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage();
            }}
            className="mt-3 flex gap-2"
          >
            <Button
              type="button"
              variant={speech.listening ? "default" : "outline"}
              onClick={toggleMic}
              disabled={streaming}
              title={speech.supported ? "Voice answer" : "Voice not supported"}
              className={speech.listening ? "bg-gradient-primary" : ""}
            >
              {speech.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={streaming ? "Interviewer is typing..." : speech.listening ? "Listening — speak now…" : "Type or use the mic…"}
              disabled={streaming}
            />
            <Button
              type="submit"
              disabled={streaming || !input.trim()}
              className="bg-gradient-primary shadow-soft hover:shadow-elegant"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>

        <aside className="hidden lg:block">
          <WebcamConfidence />
        </aside>
      </div>
    );
  }


  // ===== REPORT =====
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-4 py-1.5 text-xs font-medium shadow-soft">
          <Trophy className="h-3.5 w-3.5 text-accent" /> Interview complete
        </div>
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
          Your <span className="text-gradient">Performance Report</span>
        </h1>
        {feedback && (
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{feedback.summary}</p>
        )}
      </div>

      {feedback && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {[
              { label: "Overall", value: feedback.overall_score, tone: "from-primary to-accent" },
              { label: "Communication", value: feedback.communication_score, tone: "from-blue-400 to-blue-600" },
              { label: "Technical", value: feedback.technical_score, tone: "from-emerald-400 to-emerald-600" },
              { label: "Confidence", value: feedback.confidence_score, tone: "from-amber-400 to-amber-600" },
              { label: "Keyword relevance", value: feedback.keyword_relevance_score ?? 0, tone: "from-fuchsia-400 to-fuchsia-600", show: feedback.keyword_relevance_score != null },
              { label: "Clarity", value: feedback.clarity_score ?? 0, tone: "from-cyan-400 to-cyan-600", show: feedback.clarity_score != null },
            ]
              .filter((s) => s.show !== false)
              .map((s) => (
                <div key={s.label} className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`mt-2 bg-gradient-to-br ${s.tone} bg-clip-text text-3xl font-bold text-transparent`}>
                    {Math.round(s.value)}
                    <span className="text-base text-muted-foreground">/100</span>
                  </p>
                </div>
              ))}
          </div>

          {(feedback.matched_keywords?.length || feedback.missing_keywords?.length) ? (
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
                <h3 className="text-sm font-semibold text-muted-foreground">Keywords you used well</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(feedback.matched_keywords ?? []).map((k) => (
                    <span key={k} className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                      {k}
                    </span>
                  ))}
                  {!feedback.matched_keywords?.length && (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
                <h3 className="text-sm font-semibold text-muted-foreground">Keywords to weave in next time</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(feedback.missing_keywords ?? []).map((k) => (
                    <span key={k} className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                      {k}
                    </span>
                  ))}
                  {!feedback.missing_keywords?.length && (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <ListCard
              title="Strengths"
              icon={<CheckCircle2 className="h-5 w-5" />}
              tone="success"
              items={feedback.strengths}
            />
            <ListCard
              title="Areas to improve"
              icon={<Lightbulb className="h-5 w-5" />}
              tone="warning"
              items={feedback.improvements}
            />
          </div>

          <div className="mt-5 rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
            <h3 className="text-lg font-semibold">Next steps</h3>
            <ul className="mt-3 space-y-2">
              {feedback.next_steps.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <ArrowRight className="mt-0.5 h-4 w-4 flex-none text-primary" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Button onClick={restart} className="bg-gradient-primary shadow-soft hover:shadow-elegant">
          <RefreshCw className="mr-2 h-4 w-4" /> New interview
        </Button>
        <Button variant="outline" asChild>
          <Link to="/reports">View all reports</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}

function ListCard({
  title,
  icon,
  tone,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  tone: "success" | "warning";
  items: string[];
}) {
  const colors =
    tone === "success"
      ? "bg-success/10 text-success"
      : "bg-amber-500/10 text-amber-700 dark:text-amber-400";
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
      <div className="flex items-center gap-2">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colors}`}>{icon}</div>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((it, i) => (
          <li key={i} className="text-sm leading-relaxed text-muted-foreground">
            • {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
