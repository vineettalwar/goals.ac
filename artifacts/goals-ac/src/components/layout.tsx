import { Link } from "wouter";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans selection:bg-primary/20">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl tracking-tight hover:opacity-80 transition-opacity">
            goals.ac
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link href="/roadmaps" className="text-muted-foreground hover:text-foreground transition-colors">
              Directory
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <footer className="border-t border-border bg-muted/20 py-12 mt-auto">
        <div className="container mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} goals.ac. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/roadmaps" className="hover:text-foreground transition-colors">Roadmaps</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
