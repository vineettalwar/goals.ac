import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FolderKanban,
  LogOut,
  Menu,
  Shield,
  X,
  type LucideIcon,
} from "lucide-react";
import { APP_SHELL_MAIN_OFFSET, cn } from "@workspace/app-shell";
import { useAuth } from "@/context/auth";
import { apiFetch } from "@/lib/api";
import { ADMIN_NAV_ITEMS, isAdminNavActive } from "./admin-nav";

const FOOTER_ITEMS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "All Projects", href: "/projects", icon: FolderKanban },
  { label: "Back to App", href: "/dashboard", icon: ArrowLeft },
];

function NavItem({
  label,
  href,
  icon: Icon,
  active,
  children,
  onNavigate,
}: {
  label: string;
  href: string;
  icon: LucideIcon;
  active: boolean;
  children?: React.ReactNode;
  onNavigate?: () => void;
}) {
  return (
    <li>
      <Link
        to={href}
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

function NavSubItem({
  label,
  href,
  active,
  onNavigate,
}: {
  label: string;
  href: string;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <li>
      <Link
        to={href}
        onClick={onNavigate}
        className={cn(
          "block rounded-md py-1.5 pl-9 pr-3 text-[13px] transition-colors",
          active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {label}
      </Link>
    </li>
  );
}

function ImpersonationBanner() {
  const { impersonation, supportOrganization, refresh } = useAuth();
  const navigate = useNavigate();
  const [stopping, setStopping] = useState(false);

  if (!impersonation && !supportOrganization) return null;

  async function exitView() {
    setStopping(true);
    try {
      await apiFetch("/api/admin/impersonate", { method: "DELETE" });
      await refresh();
      navigate("/admin/organizations");
    } finally {
      setStopping(false);
    }
  }

  return (
    <div className="sticky top-0 z-50 border-b border-amber-500/40 bg-amber-500/10 px-4 py-2">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm">
          {supportOrganization ? (
            <>
              Managing <strong>{supportOrganization.name}</strong> as platform admin
            </>
          ) : (
            <>
              Viewing as <strong>{impersonation?.adminEmail}</strong>
              <span className="text-muted-foreground"> — admin: {impersonation?.adminName}</span>
            </>
          )}
        </p>
        <button
          type="button"
          onClick={() => void exitView()}
          disabled={stopping}
          className="rounded-md border border-border bg-background px-3 py-1 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
        >
          {stopping ? "Exiting…" : "Exit view"}
        </button>
      </div>
    </div>
  );
}

export function AdminLayout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const userName = user?.name || user?.email || "Admin";
  const userEmail = user?.email || "";

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
    <div className="flex h-screen overflow-hidden bg-background">
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
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary">
            <Shield className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
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
          "flex h-full w-[220px] shrink-0 flex-col border-r border-border bg-card",
          "fixed inset-y-0 left-0 z-50 transition-[translate] duration-200 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full pointer-events-none",
          "lg:relative lg:z-auto lg:translate-x-0 lg:pointer-events-auto",
        )}
      >
        <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
            <Shield className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
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

        <nav className="flex-1 overflow-y-auto px-2 py-3">
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
              onClick={() => void logout()}
              className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground lg:h-auto lg:w-auto"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <div className={`flex min-w-0 flex-1 flex-col overflow-hidden ${APP_SHELL_MAIN_OFFSET}`}>
        <ImpersonationBanner />
        <main className="min-w-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
