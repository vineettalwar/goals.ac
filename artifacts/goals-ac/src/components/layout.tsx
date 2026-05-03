import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/context/theme";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LayoutDashboard, LogOut, ChevronDown, ShieldCheck, Sun, Moon, Settings, Search, BarChart3, Zap, Lock } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/", { replace: true });
    setTimeout(() => logout(), 0);
  };

  const initials = user?.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "";

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans selection:bg-primary/20">
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
          <Link to="/" className="hover:opacity-80 transition-opacity">
            <Logo />
          </Link>
          <nav className="flex items-center gap-3 text-sm font-medium">
            <Link
              to={user ? "/roadmaps" : "/signup"}
              className="text-muted-foreground hover:text-foreground transition-colors px-2 py-1 flex items-center gap-1"
            >
              Directory
              {!user && <Lock className="h-3 w-3 text-muted-foreground/70" />}
            </Link>
            <Link
              to="/pricing"
              className="text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
            >
              Pricing
            </Link>
            <Link
              to="/about"
              className="text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
            >
              About
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors px-2 py-1 focus:outline-none">
                  Tools <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52 bg-card border-border shadow-md">
                <DropdownMenuItem asChild>
                  <Link to="/geo-audit" className="flex items-center gap-2 text-foreground hover:text-foreground focus:text-foreground">
                    <Zap className="h-4 w-4 text-blue-500" />
                    GEO Audit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={user ? "/competitor-analysis" : "/signup"} className="flex items-center gap-2 text-foreground hover:text-foreground focus:text-foreground">
                    <Search className="h-4 w-4 text-purple-500" />
                    <span className="flex-1">Competitor Analysis</span>
                    {!user && <Lock className="h-3 w-3 text-muted-foreground" />}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={user ? "/keyword-tracking" : "/signup"} className="flex items-center gap-2 text-foreground hover:text-foreground focus:text-foreground">
                    <BarChart3 className="h-4 w-4 text-emerald-500" />
                    <span className="flex-1">Keyword Tracking</span>
                    {!user && <Lock className="h-3 w-3 text-muted-foreground" />}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full hover:opacity-80 transition-opacity focus:outline-none">
                    <Avatar className="h-7 w-7">
                      {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                      <AvatarFallback className="text-xs bg-primary/10 text-primary border border-primary/20">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:block text-sm font-medium">{user.name}</span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-card border-border shadow-md">
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="flex items-center gap-2 text-foreground hover:text-foreground focus:text-foreground">
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="flex items-center gap-2 text-foreground hover:text-foreground focus:text-foreground">
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  {user.role === "super_admin" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/admin/content-strategies" className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 focus:text-blue-600">
                          <ShieldCheck className="h-4 w-4" />
                          Admin
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="flex items-center gap-2 text-rose-500 dark:text-rose-400 focus:text-rose-500 focus:bg-rose-50 dark:focus:bg-rose-400/10"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button
                  size="sm"
                  asChild
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 border-0 text-white glow-primary"
                >
                  <Link to="/signup">Sign up</Link>
                </Button>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="border-t border-border bg-background mt-auto">
        <div className="container mx-auto px-4 md:px-8 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-10">
            <div className="col-span-2 md:col-span-1">
              <Logo size={18} />
              <p className="text-sm text-muted-foreground mt-3 max-w-xs leading-relaxed">
                The data-driven growth platform for B2B founders.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4">Product</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><Link to="/" className="hover:text-foreground transition-colors">Build a roadmap</Link></li>
                <li><Link to="/geo-audit" className="hover:text-foreground transition-colors">GEO Audit</Link></li>
                <li><Link to={user ? "/competitor-analysis" : "/signup"} className="hover:text-foreground transition-colors">Competitor Analysis</Link></li>
                <li><Link to={user ? "/keyword-tracking" : "/signup"} className="hover:text-foreground transition-colors">Keyword Tracking</Link></li>
                <li><Link to={user ? "/roadmaps" : "/signup"} className="hover:text-foreground transition-colors">Roadmap Directory</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4">Company</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><Link to="/about" className="hover:text-foreground transition-colors">About</Link></li>
                <li><Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><a href="mailto:hello@goals.ac" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4">Get started</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                {user ? (
                  <>
                    <li><Link to="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link></li>
                    <li><Link to="/settings" className="hover:text-foreground transition-colors">Settings</Link></li>
                  </>
                ) : (
                  <>
                    <li><Link to="/signup" className="hover:text-foreground transition-colors">Sign up free</Link></li>
                    <li><Link to="/login" className="hover:text-foreground transition-colors">Sign in</Link></li>
                  </>
                )}
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} goals.ac. All rights reserved.</p>
            <p>Built for founders who'd rather ship than plan.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
