import { Link } from "react-router-dom";
import { Logo } from "@/components/logo";

interface AuthShellProps {
  children: React.ReactNode;
}

const MARKETING_URL = import.meta.env.VITE_MARKETING_URL ?? "http://localhost:3001";

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="container mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
          <Link to="/login" className="hover:opacity-80 transition-opacity">
            <Logo />
          </Link>
          <a
            href={MARKETING_URL}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Marketing site
          </a>
        </div>
      </header>
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
