import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, QUESTIONS, PASS_THRESHOLD, type Category } from "@/lib/questions";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, ArrowRight, RotateCw, Flag } from "lucide-react";

export const Route = createFileRoute("/_app/test")({
  head: () => ({ meta: [{ title: "Aptitude Test — ProView AI" }] }),
  component: TestPage,
});

const TIME_PER_QUESTION = 45; // seconds

function TestPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [category, setCategory] = useState<Category | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [current, setCurrent] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);

  const questions = useMemo(() => (category ? QUESTIONS[category] : []), [category]);
  const totalTime = questions.length * TIME_PER_QUESTION;

  useEffect(() => {
    if (!startedAt || finished) return;
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const left = totalTime - elapsed;
      setSecondsLeft(left);
      if (left <= 0) {
        clearInterval(id);
        finish();
      }
    }, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt, finished]);

  // Keyboard shortcuts during active test
  useEffect(() => {
    if (!category || finished) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const q = questions[current];
      if (!q) return;
      if (/^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < q.options.length) select(q.id, idx);
      } else if (e.key === "ArrowRight") {
        setCurrent((c) => Math.min(questions.length - 1, c + 1));
      } else if (e.key === "ArrowLeft") {
        setCurrent((c) => Math.max(0, c - 1));
      } else if (e.key.toLowerCase() === "f") {
        setFlagged((p) => ({ ...p, [q.id]: !p[q.id] }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, finished, current, questions]);

  const start = (cat: Category) => {
    setCategory(cat);
    setAnswers({});
    setFlagged({});
    setCurrent(0);
    setFinished(false);
    setStartedAt(Date.now());
    setSecondsLeft(QUESTIONS[cat].length * TIME_PER_QUESTION);
  };

  const select = (qid: string, idx: number) => setAnswers((p) => ({ ...p, [qid]: idx }));
  const toggleFlag = (qid: string) => setFlagged((p) => ({ ...p, [qid]: !p[qid] }));

  const finish = async () => {
    if (!category || !startedAt || finished) return;
    setFinished(true);
    const correct = questions.filter((q) => answers[q.id] === q.correct).length;
    const score = (correct / questions.length) * 100;
    const duration = Math.floor((Date.now() - startedAt) / 1000);
    const passed = score >= PASS_THRESHOLD;

    if (user) {
      setSaving(true);
      const { error } = await supabase.from("test_attempts").insert({
        user_id: user.id,
        category,
        total_questions: questions.length,
        correct_answers: correct,
        score_percent: score,
        duration_seconds: duration,
        passed,
        details: answers,
      });
      setSaving(false);
      if (error) toast.error("Couldn't save attempt: " + error.message);
      else toast.success(passed ? "Great work — you passed!" : "Keep practicing — you'll get there!");
    }
  };

  // Category selection
  if (!category) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-bold sm:text-4xl">Round 1 — <span className="text-gradient">Aptitude Test</span></h1>
        <p className="mt-2 text-muted-foreground">Pick a category to begin. Each test is timed — stay focused!</p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => start(c.id)}
              className="group rounded-2xl border border-border/60 bg-card p-6 text-left shadow-soft transition-smooth hover:-translate-y-1 hover:shadow-elegant"
            >
              <div className="text-4xl">{c.emoji}</div>
              <h3 className="mt-4 text-xl font-semibold">{c.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
              <p className="mt-4 text-xs text-muted-foreground">
                {QUESTIONS[c.id].length} questions · {QUESTIONS[c.id].length * TIME_PER_QUESTION / 60} min
              </p>
              <span className="mt-5 inline-flex items-center text-sm font-medium text-primary">
                Start <ArrowRight className="ml-1 h-4 w-4 transition-smooth group-hover:translate-x-1" />
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Results
  if (finished) {
    const correct = questions.filter((q) => answers[q.id] === q.correct).length;
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= PASS_THRESHOLD;
    const skipped = questions.filter((q) => answers[q.id] === undefined).length;
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="rounded-3xl border border-border/60 bg-card p-8 text-center shadow-elegant">
          <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${passed ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
            {passed ? <CheckCircle2 className="h-10 w-10" /> : <XCircle className="h-10 w-10" />}
          </div>
          <h2 className="mt-5 text-3xl font-bold">{passed ? "You passed! 🎉" : "Almost there!"}</h2>
          <p className="mt-2 text-muted-foreground">You scored {correct} out of {questions.length}{skipped ? ` · ${skipped} skipped` : ""}.</p>
          <div className="mx-auto mt-6 max-w-xs">
            <div className="text-6xl font-bold text-gradient">{score}%</div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-gradient-primary transition-all" style={{ width: `${score}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Pass threshold: {PASS_THRESHOLD}%</p>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button variant="outline" onClick={() => { setCategory(null); setFinished(false); }}>
              <RotateCw className="mr-2 h-4 w-4" /> Try another
            </Button>
            {passed ? (
              <Button className="bg-gradient-primary" asChild><Link to="/interview">Continue to Round 2 <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            ) : (
              <Button className="bg-gradient-primary" onClick={() => start(category)}>Retry</Button>
            )}
            <Button variant="ghost" onClick={() => navigate({ to: "/dashboard" })} disabled={saving}>Back to dashboard</Button>
          </div>

          {/* Review */}
          <div className="mt-10 text-left">
            <h3 className="mb-4 text-lg font-semibold">Review</h3>
            <div className="space-y-3">
              {questions.map((q, i) => {
                const ans = answers[q.id];
                const ok = ans === q.correct;
                return (
                  <div key={q.id} className="rounded-xl border border-border/60 bg-background/50 p-4">
                    <p className="text-sm font-medium">Q{i + 1}. {q.question}</p>
                    <div className="mt-2 space-y-1">
                      {q.options.map((opt, oi) => {
                        const isAns = ans === oi;
                        const isCorrect = q.correct === oi;
                        return (
                          <div
                            key={oi}
                            className={`rounded-md px-3 py-1.5 text-xs ${
                              isCorrect
                                ? "bg-success/15 text-success"
                                : isAns
                                  ? "bg-destructive/15 text-destructive"
                                  : "text-muted-foreground"
                            }`}
                          >
                            <span className="mr-2 font-bold">{String.fromCharCode(65 + oi)}.</span>
                            {opt}
                            {isCorrect && <span className="ml-2">✓</span>}
                            {isAns && !isCorrect && <span className="ml-2">✗ your answer</span>}
                          </div>
                        );
                      })}
                      {ans === undefined && <p className="text-xs italic text-muted-foreground">Skipped</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active test
  const q = questions[current];
  const min = Math.max(0, Math.floor(secondsLeft / 60));
  const sec = Math.max(0, secondsLeft % 60).toString().padStart(2, "0");
  const progress = ((current + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;
  const flaggedCount = Object.values(flagged).filter(Boolean).length;
  const lowTime = secondsLeft <= 30 && secondsLeft > 0;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">
          Question <span className="text-foreground">{current + 1}</span> / {questions.length}
          <span className="ml-3 text-xs">· {answeredCount} answered{flaggedCount ? ` · ${flaggedCount} flagged` : ""}</span>
        </p>
        <div
          className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold shadow-soft ${
            lowTime ? "animate-pulse bg-destructive/15 text-destructive" : "bg-card"
          }`}
        >
          <Clock className="h-4 w-4 text-primary" />
          {min}:{sec}
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-gradient-primary transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_220px]">
        <div>
          <div className="rounded-2xl border border-border/60 bg-card p-8 shadow-elegant">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-semibold leading-snug sm:text-2xl">{q.question}</h2>
              <button
                type="button"
                onClick={() => toggleFlag(q.id)}
                aria-label={flagged[q.id] ? "Unflag question" : "Flag question for review"}
                className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-smooth ${
                  flagged[q.id]
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                <Flag className="h-3.5 w-3.5" />
                {flagged[q.id] ? "Flagged" : "Flag"}
              </button>
            </div>
            <div className="mt-6 space-y-3">
              {q.options.map((opt, i) => {
                const selected = answers[q.id] === i;
                return (
                  <button
                    key={i}
                    onClick={() => select(q.id, i)}
                    className={`w-full rounded-xl border-2 p-4 text-left transition-smooth ${
                      selected
                        ? "border-primary bg-primary/5 shadow-soft"
                        : "border-border/60 bg-background hover:border-primary/40 hover:bg-muted/50"
                    }`}
                  >
                    <span className={`mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${selected ? "bg-gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
            <p className="mt-5 text-xs text-muted-foreground">
              Tip: press <kbd className="rounded bg-muted px-1.5 py-0.5">1–4</kbd> to answer, <kbd className="rounded bg-muted px-1.5 py-0.5">←</kbd>/<kbd className="rounded bg-muted px-1.5 py-0.5">→</kbd> to navigate, <kbd className="rounded bg-muted px-1.5 py-0.5">F</kbd> to flag.
            </p>
          </div>

          <div className="mt-6 flex justify-between">
            <Button variant="outline" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>
              Previous
            </Button>
            {current < questions.length - 1 ? (
              <Button className="bg-gradient-primary" onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button className="bg-gradient-accent text-accent-foreground" onClick={finish}>
                Submit test
              </Button>
            )}
          </div>
        </div>

        {/* Question palette */}
        <aside className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft lg:sticky lg:top-20 lg:self-start">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Questions</p>
          <div className="mt-3 grid grid-cols-5 gap-2 lg:grid-cols-4">
            {questions.map((qq, i) => {
              const answered = answers[qq.id] !== undefined;
              const isCurrent = i === current;
              const isFlagged = flagged[qq.id];
              return (
                <button
                  key={qq.id}
                  onClick={() => setCurrent(i)}
                  aria-label={`Go to question ${i + 1}`}
                  className={`relative flex h-9 w-full items-center justify-center rounded-lg text-xs font-semibold transition-smooth ${
                    isCurrent
                      ? "bg-gradient-primary text-primary-foreground shadow-soft"
                      : answered
                        ? "bg-primary/10 text-primary hover:bg-primary/20"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  {i + 1}
                  {isFlagged && (
                    <Flag className="absolute -right-1 -top-1 h-3 w-3 fill-amber-500 text-amber-500" />
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-4 space-y-1.5 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-gradient-primary" /> Current</div>
            <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-primary/20" /> Answered</div>
            <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-muted" /> Unanswered</div>
            <div className="flex items-center gap-2"><Flag className="h-3 w-3 fill-amber-500 text-amber-500" /> Flagged</div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="mt-4 w-full"
            onClick={finish}
          >
            Submit early
          </Button>
        </aside>
      </div>
    </div>
  );
}
