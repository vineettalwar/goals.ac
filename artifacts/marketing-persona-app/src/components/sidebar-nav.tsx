"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Target,
  Zap,
  FolderOpen,
  Map,
  Network,
  BarChart2,
  Settings,
  LogOut,
  Leaf,
  Layers,
  Search,
  MessageSquare,
  Plug,
  Eye,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectSwitcher } from "@/components/project-switcher";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Autopilot", href: "/autopilot", icon: Zap },
  { label: "Agent", href: "/agent", icon: MessageSquare },
  { label: "Projects", href: "/projects", icon: FolderOpen },
  { label: "Roadmaps", href: "/growth-roadmaps", icon: Map },
  { label: "Topical Map", href: "/topical-map", icon: Network },
  { label: "Content Studio", href: "/studio", icon: Layers },
  { label: "Competitor Analysis", href: "/competitor-analysis", icon: Users },
  { label: "Goals", href: "/goals", icon: Target },
  { label: "Keywords", href: "/keyword-tracking", icon: BarChart2 },
  { label: "Visibility", href: "/ai-visibility", icon: Eye },
  { label: "Integrations", href: "/integrations", icon: Plug },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface SidebarNavProps {
  userName: string;
  userEmail: string;
}

export function SidebarNav({ userName, userEmail }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
          <Leaf className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold tracking-tight">goals.ac</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-secondary font-medium text-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "")} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Project switcher + user */}
      <div className="border-t border-border">
        <ProjectSwitcher />
      </div>
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{userName}</p>
            <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="ml-auto shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
