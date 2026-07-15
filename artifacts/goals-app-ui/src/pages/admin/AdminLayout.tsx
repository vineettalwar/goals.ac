import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FolderKanban,
  LogOut,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@workspace/app-shell";
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
}: {
  label: string;
  href: string;
  icon: LucideIcon;
  active: boolean;
  children?: React.ReactNode;
}) {
  return (
    <li>
      <Link
        to={href}
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

function NavSubItem({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <li>
      <Link
        to={href}
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
      <div className="flex items-center justify-between gap-4">
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

  const userName = user?.name || user?.email || "Admin";
  const userEmail = user?.email || "";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="flex h-full w-[220px] shrink-0 flex-col border-r border-border bg-card">
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
                >
                  {showChildren ? (
                    <ul className="mt-0.5 space-y-0.5 pb-1">
                      {item.children!.map((child) => (
                        <NavSubItem
                          key={child.href}
                          label={child.label}
                          href={child.href}
                          active={isAdminNavActive(pathname, child)}
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
              className="ml-auto shrink-0 text-muted-foreground transition-colors hover:text-foreground"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <ImpersonationBanner />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
