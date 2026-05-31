import Link from "next/link";
import { type ReactNode } from "react";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[--border] bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl tracking-tight text-primary">goals.ac</Link>
          <nav className="hidden sm:flex items-center gap-6 text-sm">
            <Link href="/roadmaps" className="text-muted-foreground hover:text-foreground transition-colors">Roadmaps</Link>
            <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">About</Link>
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
            <Link
              href="/signup"
              className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[--border] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 sm:grid-cols-4 gap-8">
          <div className="col-span-2 sm:col-span-1">
            <p className="font-bold text-primary mb-2">goals.ac</p>
            <p className="text-xs text-muted-foreground leading-relaxed">AI-powered growth strategy and content for B2B startups.</p>
          </div>
          {[
            { title: "Product", links: [["Roadmaps", "/roadmaps"], ["Pricing", "/pricing"]] },
            { title: "Company", links: [["About", "/about"]] },
            { title: "Legal", links: [["Privacy", "/privacy"], ["Terms", "/terms"]] },
          ].map(({ title, links }) => (
            <div key={title}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{title}</p>
              <ul className="space-y-2">
                {links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="text-sm text-muted-foreground hover:text-foreground">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="max-w-6xl mx-auto px-6 pb-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} goals.ac. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
