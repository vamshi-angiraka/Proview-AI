import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, Mic, BarChart3, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-gradient-hero">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 pt-16 pb-24 sm:pt-24 sm:pb-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-4 py-1.5 text-xs font-medium shadow-soft backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span>AI-powered interview training</span>
            </div>
            <h1 className="text-4xl font-bold leading-tight sm:text-6xl">
              Land your dream job with <span className="text-gradient">confidence</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              Practice realistic aptitude tests and AI-led mock interviews. Get instant, personalized feedback on what to improve — before the real recruiter does.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" className="bg-gradient-primary shadow-elegant transition-smooth hover:shadow-glow" asChild>
                <Link to="/signup">Start practicing free <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/signin">I have an account</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {["No credit card", "Instant feedback", "Track progress"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-accent" /> {t}
                </span>
              ))}
            </div>
          </div>

          {/* Floating preview card */}
          <div className="mx-auto mt-16 max-w-4xl">
            <div className="animate-float rounded-3xl border border-border/60 bg-card/80 p-2 shadow-elegant backdrop-blur">
              <div className="rounded-2xl bg-gradient-soft p-8">
                <div className="grid gap-6 sm:grid-cols-3">
                  {[
                    { label: "Confidence", value: "82%", color: "from-blue-400 to-blue-600" },
                    { label: "Clarity", value: "91%", color: "from-emerald-400 to-emerald-600" },
                    { label: "Relevance", value: "76%", color: "from-amber-400 to-amber-600" },
                  ].map((m) => (
                    <div key={m.label} className="rounded-xl bg-card p-4 shadow-soft">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{m.label}</p>
                      <p className="mt-1 text-3xl font-bold">{m.value}</p>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                        <div className={`h-full bg-gradient-to-r ${m.color}`} style={{ width: m.value }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Everything you need to prepare</h2>
          <p className="mt-4 text-muted-foreground">From aptitude to attitude — we've got you covered.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { icon: Brain, title: "Round 1 — Aptitude", desc: "Timed tests in aptitude, reasoning and programming with auto-grading." },
            { icon: Mic, title: "Round 2 — Interview", desc: "Realistic AI-led interviews that adapt to your responses." },
            { icon: BarChart3, title: "Smart Reports", desc: "Track confidence, clarity and progress over time." },
          ].map((f) => (
            <div key={f.title} className="group rounded-2xl border border-border/60 bg-card p-6 shadow-soft transition-smooth hover:shadow-elegant hover:-translate-y-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-soft">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-border/60 bg-card/40 py-10">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-6 text-center sm:grid-cols-4">
          {[
            { v: "12k+", l: "Practice sessions" },
            { v: "94%", l: "Feel more confident" },
            { v: "200+", l: "Interview prompts" },
            { v: "4.8★", l: "Avg. rating" },
          ].map((s) => (
            <div key={s.l}>
              <p className="text-3xl font-bold text-gradient sm:text-4xl">{s.v}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Loved by job seekers</h2>
          <p className="mt-4 text-muted-foreground">Real stories from people who landed offers.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            {
              n: "Aisha K.",
              r: "Frontend Developer",
              q: "The AI interviewer caught filler words I never noticed. My confidence score jumped 30 points in a week.",
            },
            {
              n: "Marcus T.",
              r: "Data Analyst",
              q: "Daily aptitude tests made the actual exam feel familiar. I passed the first round comfortably.",
            },
            {
              n: "Priya S.",
              r: "Product Manager",
              q: "Reports show exactly what to work on next — no more guessing what recruiters want.",
            },
          ].map((t) => (
            <div
              key={t.n}
              className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft transition-smooth hover:shadow-elegant"
            >
              <p className="text-sm leading-relaxed">"{t.q}"</p>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground">
                  {t.n.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold">{t.n}</p>
                  <p className="text-xs text-muted-foreground">{t.r}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-gradient-soft py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">How it works</h2>
            <p className="mt-4 text-muted-foreground">Three simple steps to interview-ready confidence.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { n: "01", t: "Sign up free", d: "Create your profile in under a minute." },
              { n: "02", t: "Practice", d: "Take aptitude tests then jump into mock interviews." },
              { n: "03", t: "Improve", d: "Review reports and track your growth." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl bg-card p-6 shadow-soft">
                <div className="font-display text-4xl font-bold text-gradient">{s.n}</div>
                <h3 className="mt-3 text-lg font-semibold">{s.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-16 max-w-2xl rounded-3xl bg-gradient-primary p-10 text-center shadow-elegant">
            <h3 className="text-2xl font-bold text-primary-foreground sm:text-3xl">Ready to ace your next interview?</h3>
            <p className="mt-3 text-primary-foreground/90">Join thousands practicing smarter, not harder.</p>
            <Button size="lg" variant="secondary" className="mt-6 shadow-soft" asChild>
              <Link to="/signup">Get started — it's free</Link>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
