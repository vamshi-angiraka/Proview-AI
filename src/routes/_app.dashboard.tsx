import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Brain,
  Mic,
  BarChart3,
  ArrowRight,
  Trophy,
  Target,
  Clock,
  Sparkles,
  Flame,
} from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — ProView AI" }] }),
  component: Dashboard,
});

type Attempt = {
  id: string;
  category: string;
  score_percent: number;
  passed: boolean;
  duration_seconds: number;
  created_at: string;
};

type InterviewSession = {
  id: string;
  role: string;
  status: string;
  overall_score: number | null;
  created_at: string;
};

function Dashboard() {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [interviews, setInterviews] = useState<InterviewSession[]>([]);
  const [name, setName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase
        .from("test_attempts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("interview_sessions")
        .select("id, role, status, overall_score, created_at")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    ]).then(([a, b, p]) => {
      setAttempts((a.data as Attempt[]) ?? []);
      setInterviews((b.data as InterviewSession[]) ?? []);
      setName((p.data?.full_name as string) ?? user.email?.split("@")[0] ?? "");
      setLoading(false);
    });
  }, [user]);

  const avgScore = attempts.length
    ? Math.round(attempts.reduce((s, a) => s + Number(a.score_percent), 0) / attempts.length)
    : 0;
  const bestScore = attempts.length
    ? Math.round(Math.max(...attempts.map((a) => Number(a.score_percent))))
    : 0;
  const passedCount = attempts.filter((a) => a.passed).length;
  const interviewAvg = interviews.length
    ? Math.round(
        interviews.reduce((s, i) => s + Number(i.overall_score ?? 0), 0) / interviews.length,
      )
    : 0;

  // Streak: distinct activity days within last 7
  const recentDays = new Set<string>();
  [...attempts, ...interviews].forEach((x) => {
    const d = new Date(x.created_at);
    const diff = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
    if (diff <= 7) recentDays.add(d.toDateString());
  });
  const streak = recentDays.size;

  const isBrandNew = !loading && attempts.length === 0 && interviews.length === 0;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">
            Welcome back, <span className="text-gradient">{name || "there"}</span> 👋
          </h1>
          <p className="mt-1 text-muted-foreground">Here's a snapshot of your practice journey.</p>
        </div>
        <Button className="bg-gradient-primary shadow-soft hover:shadow-elegant" asChild>
          <Link to="/test">
            Start new test <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Onboarding banner for brand-new users */}
      {isBrandNew && (
        <div className="mt-8 overflow-hidden rounded-3xl border border-border/60 bg-gradient-soft p-8 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-card/80 px-3 py-1 text-xs font-medium shadow-soft">
                <Sparkles className="h-3.5 w-3.5 text-accent" /> Welcome to ProView AI
              </div>
              <h2 className="mt-3 text-2xl font-bold sm:text-3xl">Let's get you interview-ready</h2>
              <p className="mt-2 text-muted-foreground">
                Three quick steps to your first feedback report — usually under 10 minutes.
              </p>
            </div>
            <Button size="lg" className="bg-gradient-primary shadow-soft" asChild>
              <Link to="/test">
                Start step 1 <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              { n: "01", t: "Take an aptitude test", d: "Pick a category and try a short timed round." },
              { n: "02", t: "Run a mock interview", d: "Chat with the AI interviewer — voice optional." },
              { n: "03", t: "Read your report", d: "Spot strengths and the next thing to improve." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl bg-card p-5 shadow-soft">
                <div className="font-display text-3xl font-bold text-gradient">{s.n}</div>
                <h3 className="mt-2 font-semibold">{s.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Trophy, label: "Best Test Score", value: `${bestScore}%`, tone: "from-amber-400 to-amber-600" },
          { icon: Target, label: "Avg Test Score", value: `${avgScore}%`, tone: "from-blue-400 to-blue-600" },
          { icon: Mic, label: "Interview Avg", value: `${interviewAvg}/100`, tone: "from-violet-400 to-violet-600" },
          { icon: Flame, label: "Active Days (7d)", value: `${streak}`, tone: "from-rose-400 to-rose-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${s.tone} text-white shadow-soft`}
            >
              <s.icon className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-3xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <h2 className="mt-12 text-xl font-bold">Continue practicing</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {[
          { to: "/test", icon: Brain, title: "Aptitude Test", desc: "Sharpen reasoning & logic", cta: "Start round 1" },
          { to: "/interview", icon: Mic, title: "AI Interview", desc: "Mock interview session", cta: "Open round 2" },
          { to: "/reports", icon: BarChart3, title: "Reports", desc: "Review your past sessions", cta: "View reports" },
        ].map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="group rounded-2xl border border-border/60 bg-card p-6 shadow-soft transition-smooth hover:-translate-y-1 hover:shadow-elegant"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-soft">
              <c.icon className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{c.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
            <span className="mt-4 inline-flex items-center text-sm font-medium text-primary">
              {c.cta} <ArrowRight className="ml-1 h-4 w-4 transition-smooth group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </div>

      {/* Recent activity grid */}
      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-xl font-bold">Recent tests</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft">
            {attempts.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">No tests yet.</p>
                <Button className="mt-3 bg-gradient-primary" size="sm" asChild>
                  <Link to="/test">Start a test</Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {attempts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <p className="font-medium capitalize">{a.category}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleString()} · {Math.round(a.duration_seconds / 60)}m
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          a.passed ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                        }`}
                      >
                        {a.passed ? "Passed" : "Try again"}
                      </span>
                      <span className="text-lg font-bold">{Math.round(Number(a.score_percent))}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold">Recent interviews</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft">
            {interviews.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">No interviews yet.</p>
                <Button className="mt-3 bg-gradient-primary" size="sm" asChild>
                  <Link to="/interview">Start an interview</Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {interviews.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <p className="font-medium">{s.role}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      {Math.round(Number(s.overall_score ?? 0))}/100
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
