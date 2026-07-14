import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/use-auth";
import { useTheme } from "@/context/use-theme";
import { Logo } from "@/components/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  LogOut,
  Settings,
  Sun,
  Moon,
  Zap,
  Search,
  BarChart3,
  FolderOpen,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
}

const MARKETING_URL = import.meta.env.VITE_MARKETING_URL ?? "http://localhost:3001";

const NAV_ITEMS: Array<{
  label: string;
  icon: React.ElementType;
  to: string;
  matchPaths?: string[];
}> = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
  { label: "Projects", icon: FolderOpen, to: "/dashboard", matchPaths: ["/projects"] },
  { label: "Competitor Analysis", icon: Search, to: "/competitor-analysis" },
  { label: "Keyword Tracking", icon: BarChart3, to: "/keyword-tracking" },
  { label: "AI Visibility", icon: Eye, to: "/ai-visibility" },
];

const EXTERNAL_LINKS = [
  { label: "GEO Audit", icon: Zap, href: `${MARKETING_URL}/geo-audit` },
] as const;

function NavItem({ label, icon: Icon, to, active }: { label: string; icon: React.ElementType; to: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group relative",
        active
          ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-full -ml-px" />
      )}
      <Icon className={cn("w-4 h-4 shrink-0 transition-colors", active ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground group-hover:text-foreground")} />
      {label}
    </Link>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    navigate("/", { replace: true });
    setTimeout(() => logout(), 0);
  };

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "";

  function isActive(item: typeof NAV_ITEMS[number]) {
    if (item.matchPaths) {
      return item.matchPaths.some((p) => location.pathname.startsWith(p));
    }
    return location.pathname === item.to;
  }

  return (
    <div className="min-h-dvh flex bg-background text-foreground font-sans selection:bg-primary/20">
      <aside className="w-56 shrink-0 flex flex-col border-r border-border/60 bg-background sticky top-0 h-dvh">
        <div className="px-4 py-4 border-b border-border/60">
          <Link to="/dashboard" className="hover:opacity-80 transition-opacity inline-block">
            <Logo />
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.label} {...item} active={isActive(item)} />
          ))}
          {EXTERNAL_LINKS.map(({ label, icon: Icon, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </a>
          ))}
        </nav>

        <div className="border-t border-border/60 px-3 py-3 space-y-1">
          <NavItem
            label="Settings"
            icon={Settings}
            to="/settings"
            active={location.pathname === "/settings"}
          />
        </div>

        <div className="border-t border-border/60 px-3 py-3 flex items-center gap-2">
          <Avatar className="h-8 w-8 shrink-0">
            {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
            <AvatarFallback className="text-xs bg-primary/10 text-primary border border-primary/20">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate leading-tight">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate leading-tight">{user?.email}</p>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sign out"
              className="rounded-md p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-400/10 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
