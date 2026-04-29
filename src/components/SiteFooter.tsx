
export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background/60">
      <div className="mx-auto max-w-7xl px-6 py-8 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} ProView AI — practice, perform, get hired.</p>
      </div>
    </footer>
  );
}
