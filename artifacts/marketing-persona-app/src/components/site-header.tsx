import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-[--border] bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl tracking-tight text-primary">
          goals.ac
        </Link>
        <nav className="hidden sm:flex items-center gap-6 text-sm">
          <Link href="/content-engine" className="text-muted-foreground hover:text-foreground transition-colors">
            Content Engine
          </Link>
          <Link href="/features" className="text-muted-foreground hover:text-foreground transition-colors">
            Features
          </Link>
          <Link href="/roadmaps" className="text-muted-foreground hover:text-foreground transition-colors">
            Roadmaps
          </Link>
          <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
            About
          </Link>
          <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
