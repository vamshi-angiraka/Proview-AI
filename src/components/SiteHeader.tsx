
import { Link, useNavigate } from "@tanstack/react-router";
import { Brain, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 transition-smooth hover:opacity-80">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-soft">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold">ProView <span className="text-gradient">AI</span></span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {user ? (
            <>
              <Link to="/dashboard" className="text-sm font-medium text-muted-foreground transition-smooth hover:text-foreground" activeProps={{ className: "text-foreground" }}>Dashboard</Link>
              <Link to="/test" className="text-sm font-medium text-muted-foreground transition-smooth hover:text-foreground" activeProps={{ className: "text-foreground" }}>Aptitude</Link>
              <Link to="/interview" className="text-sm font-medium text-muted-foreground transition-smooth hover:text-foreground" activeProps={{ className: "text-foreground" }}>Interview</Link>
              <Link to="/reports" className="text-sm font-medium text-muted-foreground transition-smooth hover:text-foreground" activeProps={{ className: "text-foreground" }}>Reports</Link>
              <Link to="/profile" className="text-sm font-medium text-muted-foreground transition-smooth hover:text-foreground" activeProps={{ className: "text-foreground" }}>Profile</Link>
            </>
          ) : (
            <>
              <a href="/#features" className="text-sm font-medium text-muted-foreground transition-smooth hover:text-foreground">Features</a>
              <a href="/#how" className="text-sm font-medium text-muted-foreground transition-smooth hover:text-foreground">How it works</a>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
              <LogOut className="mr-2 h-4 w-4" />Sign out
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild><Link to="/signin">Sign in</Link></Button>
              <Button size="sm" className="bg-gradient-primary shadow-soft hover:shadow-elegant" asChild>
                <Link to="/signup">Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
