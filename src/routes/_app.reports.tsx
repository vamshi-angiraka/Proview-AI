import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, TrendingUp, Mic } from "lucide-react";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Reports — ProView AI" }] }),
  component: ReportsPage,
});

type Attempt = {
  id: string;
  category: string;
  score_percent: number;
  passed: boolean;
  duration_seconds: number;
  total_questions: number;
  correct_answers: number;
  created_at: string;
};

type InterviewSession = {
  id: string;
  role: string;
  status: string;
  overall_score: number | null;
  communication_score: number | null;
  technical_score: number | null;
  confidence_score: number | null;
  created_at: string;
};

type Range = "7" | "30" | "90" | "all";
type CategoryFilter = "all" | string;

function ReportsPage() {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [interviews, setInterviews] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>("30");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("test_attempts").select("*").order("created_at", { ascending: false }),
      supabase.from("interview_sessions").select("*").eq("status", "completed").order("created_at", { ascending: false }),
    ]).then(([a, b]) => {
      setAttempts((a.data as Attempt[]) ?? []);
      setInterviews((b.data as InterviewSession[]) ?? []);
      setLoading(false);
    });
  }, [user]);

  const cutoff = useMemo(() => {
    if (range === "all") return 0;
    return Date.now() - Number(range) * 24 * 60 * 60 * 1000;
  }, [range]);

  const filtered = useMemo(() => {
    return attempts.filter((a) => {
      if (range !== "all" && new Date(a.created_at).getTime() < cutoff) return false;
      if (categoryFilter !== "all" && a.category !== categoryFilter) return false;
      return true;
    });
  }, [attempts, cutoff, range, categoryFilter]);

  const allCategories = useMemo(
    () => Array.from(new Set(attempts.map((a) => a.category))),
    [attempts],
  );

  const chartData = useMemo(() => {
    return filtered
      .slice()
      .reverse()
      .map((a, i) => ({
        idx: i + 1,
        date: new Date(a.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        score: Math.round(Number(a.score_percent)),
        category: a.category,
      }));
  }, [filtered]);

  const byCategory: Record<string, Attempt[]> = {};
  for (const a of filtered) {
    if (!byCategory[a.category]) byCategory[a.category] = [];
    byCategory[a.category].push(a);
  }

  const overallAvg = filtered.length
    ? Math.round(filtered.reduce((s, a) => s + Number(a.score_percent), 0) / filtered.length)
    : 0;
  const passRate = filtered.length
    ? Math.round((filtered.filter((a) => a.passed).length / filtered.length) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Your <span className="text-gradient">Reports</span></h1>
          <p className="mt-2 text-muted-foreground">Track every attempt and watch your progress climb.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={range} onValueChange={(v) => setRange(v as Range)}>
            <SelectTrigger className="w-[150px] bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[170px] bg-card capitalize">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {allCategories.map((c) => (
                <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="mt-12 text-center text-muted-foreground">Loading…</div>
      ) : attempts.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-border/60 bg-card p-12 text-center shadow-soft">
          <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">No reports yet. Take a test to start tracking your progress!</p>
          <Button className="mt-5 bg-gradient-primary" asChild><Link to="/test">Start a test</Link></Button>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {/* Stat row */}
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Attempts", value: filtered.length },
              { label: "Average score", value: `${overallAvg}%` },
              { label: "Pass rate", value: `${passRate}%` },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-3xl font-bold">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Trend chart */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Score trend</h2>
              <span className="text-xs text-muted-foreground">{chartData.length} point{chartData.length === 1 ? "" : "s"}</span>
            </div>
            {chartData.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">No data in this range. Try a wider window.</p>
            ) : (
              <ChartContainer
                className="mt-4 h-[260px] w-full"
                config={{ score: { label: "Score", color: "hsl(var(--primary))" } }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={12} width={32} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#scoreFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </div>

          {Object.entries(byCategory).map(([cat, list]) => (
            <CategoryCard key={cat} category={cat} list={list} />
          ))}

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
            <div className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-accent" />
              <h2 className="text-xl font-semibold">AI Interview sessions</h2>
            </div>
            {interviews.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No interviews yet. <Link to="/interview" className="font-medium text-primary hover:underline">Start one</Link> to see results here.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-border">
                {interviews.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div>
                      <p className="font-medium">{s.role}</p>
                      <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      Overall {Math.round(Number(s.overall_score ?? 0))}/100
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border/60 bg-gradient-soft p-6 shadow-soft">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-accent" /> Tip
            </div>
            <p className="mt-2 text-sm">Consistency beats intensity — take a short test daily and watch your average climb.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryCard({ category, list }: { category: string; list: Attempt[] }) {
  const avg = Math.round(list.reduce((s, a) => s + Number(a.score_percent), 0) / list.length);
  const best = Math.round(Math.max(...list.map((a) => Number(a.score_percent))));
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold capitalize">{category}</h2>
          <p className="text-xs text-muted-foreground">{list.length} attempt{list.length > 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-6 text-sm">
          <div><span className="text-muted-foreground">Avg </span><span className="text-lg font-bold">{avg}%</span></div>
          <div><span className="text-muted-foreground">Best </span><span className="text-lg font-bold text-gradient">{best}%</span></div>
        </div>
      </div>

      <div className="mt-5 flex items-end gap-1.5 h-24">
        {list.slice().reverse().map((a) => (
          <div key={a.id} className="flex flex-1 flex-col items-center gap-1" title={`${Math.round(Number(a.score_percent))}%`}>
            <div
              className="w-full rounded-t bg-gradient-primary transition-all"
              style={{ height: `${Math.max(6, Number(a.score_percent))}%` }}
            />
          </div>
        ))}
      </div>

      <div className="mt-5 divide-y divide-border">
        {list.map((a) => (
          <div key={a.id} className="flex items-center justify-between py-3 text-sm">
            <div>
              <p className="font-medium">{new Date(a.created_at).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                {a.correct_answers}/{a.total_questions} correct · {Math.round(a.duration_seconds / 60)}m
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${a.passed ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                {a.passed ? "Passed" : "Failed"}
              </span>
              <span className="w-12 text-right font-bold">{Math.round(Number(a.score_percent))}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
