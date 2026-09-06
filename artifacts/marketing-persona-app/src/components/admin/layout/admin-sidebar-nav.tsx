"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import {
  ArrowLeft,
  FolderKanban,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { GoalsBrandMark } from "@workspace/app-shell/brand-mark";
import { ADMIN_NAV_ITEMS, isAdminNavActive } from "@/components/admin/layout/admin-nav-config";
import { cn } from "@/lib/utils";

type NavItemDef = {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
};

const FOOTER_ITEMS: NavItemDef[] = [
  { label: "All Projects", href: "/projects", icon: FolderKanban },
  { label: "Back to App", href: "/dashboard", icon: ArrowLeft },
];

interface NavItemProps {
  label: string;
  href: string;
  icon: LucideIcon;
  active: boolean;
  children?: React.ReactNode;
  onNavigate?: () => void;
}

function NavItem({ label, href, icon: Icon, active, children, onNavigate }: NavItemProps) {
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
          active
            ? "bg-secondary font-medium text-foreground"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        )}
      >
        <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "")} />
        {label}
      </Link>
      {children}
    </li>
  );
}

interface NavSubItemProps {
  label: string;
  href: string;
  active: boolean;
  onNavigate?: () => void;
}

function NavSubItem({ label, href, active, onNavigate }: NavSubItemProps) {
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        className={cn(
          "block rounded-md py-1.5 pl-9 pr-3 text-[13px] transition-colors",
          active
            ? "font-medium text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {label}
      </Link>
    </li>
  );
}

interface AdminSidebarNavProps {
  userName: string;
  userEmail: string;
}

export function AdminSidebarNav({ userName, userEmail }: AdminSidebarNavProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-card px-3 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-secondary"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 items-center gap-2">
          <GoalsBrandMark size={22} className="shrink-0 text-primary" />
          <span className="truncate text-sm font-semibold tracking-tight">goals.ac Admin</span>
        </div>
      </header>

      {mobileOpen ? (
        <button
          type="button"
          aria-label="Dismiss navigation"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={closeMobile}
        />
      ) : null}

      <aside
        className={cn(
          "flex h-full w-55 shrink-0 flex-col border-r border-border bg-card",
          "fixed inset-y-0 left-0 z-50 transition-[translate] duration-200 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full pointer-events-none",
          "lg:relative lg:z-auto lg:translate-x-0 lg:pointer-events-auto",
        )}
      >
        <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
          <GoalsBrandMark size={22} className="shrink-0 text-primary" />
          <div className="min-w-0">
            <span className="block text-sm font-semibold tracking-tight">goals.ac</span>
            <span className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Platform Admin
            </span>
          </div>
          <button
            type="button"
            onClick={closeMobile}
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overscroll-contain px-2 py-3 [scrollbar-width:thin]">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Administration
          </p>
          <ul className="space-y-0.5">
            {ADMIN_NAV_ITEMS.map((item) => {
              const parentActive = isAdminNavActive(pathname, item);
              const showChildren = parentActive && item.children && item.children.length > 0;

              return (
                <NavItem
                  key={item.href}
                  label={item.label}
                  href={item.href}
                  icon={item.icon}
                  active={parentActive}
                  onNavigate={closeMobile}
                >
                  {showChildren ? (
                    <ul className="mt-0.5 space-y-0.5 pb-1">
                      {item.children!.map((child) => (
                        <NavSubItem
                          key={child.href}
                          label={child.label}
                          href={child.href}
                          active={isAdminNavActive(pathname, child)}
                          onNavigate={closeMobile}
                        />
                      ))}
                    </ul>
                  ) : null}
                </NavItem>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-border px-2 py-2">
          <ul className="space-y-0.5">
            {FOOTER_ITEMS.map((item) => (
              <NavItem
                key={item.href}
                label={item.label}
                href={item.href}
                icon={item.icon}
                active={false}
                onNavigate={closeMobile}
              />
            ))}
          </ul>
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
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground lg:h-auto lg:w-auto"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
