"use client";

import { memo, useCallback, useEffect, useState, type ReactNode } from "react";
import { LogOut, Menu, Moon, Sun, X } from "lucide-react";
import { GoalsBrandMark } from "./brand-mark";
import { cn } from "./cn";
import { buildNavModel, type NavItemDef } from "./nav-config";
import { isNavChildActive, isNavItemActive, resolveNavHref } from "./nav-routing";

export type AppShellLinkProps = {
  href: string;
  className: string;
  children: ReactNode;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onFocus?: () => void;
};

export type AppSidebarShellProps = {
  pathname: string;
  activeProjectId: number | null;
  userName: string;
  userEmail: string;
  userImage?: string | null;
  userRole?: string | null;
  orgRole?: string | null;
  theme?: "light" | "dark";
  projectSwitcher: ReactNode;
  renderLink: (props: AppShellLinkProps) => ReactNode;
  onToggleTheme?: () => void;
  onSignOut?: () => void;
  onNavIntent?: (href: string) => void;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
};

const NavItemRow = memo(function NavItemRow({
  item,
  resolvedHref,
  active,
  renderLink,
  onNavIntent,
  onNavigate,
  children,
}: {
  item: NavItemDef;
  resolvedHref: string;
  active: boolean;
  renderLink: (props: AppShellLinkProps) => ReactNode;
  onNavIntent?: (href: string) => void;
  onNavigate?: () => void;
  children?: ReactNode;
}) {
  const Icon = item.icon;
  return (
    <li>
      {renderLink({
        href: resolvedHref,
        onClick: onNavigate,
        onMouseEnter: onNavIntent ? () => onNavIntent(resolvedHref) : undefined,
        onFocus: onNavIntent ? () => onNavIntent(resolvedHref) : undefined,
        className: cn(
          "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors duration-150",
          active
            ? "bg-primary/10 font-medium text-primary"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        ),
        children: (
          <>
            <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "")} />
            {item.label}
          </>
        ),
      })}
      {children}
    </li>
  );
});

function NavSection({
  title,
  items,
  pathname,
  activeProjectId,
  renderLink,
  onNavIntent,
  onNavigate,
}: {
  title: string;
  items: NavItemDef[];
  pathname: string;
  activeProjectId: number | null;
  renderLink: (props: AppShellLinkProps) => ReactNode;
  onNavIntent?: (href: string) => void;
  onNavigate?: () => void;
}) {
  return (
    <div className="mb-5 last:mb-0">
      <p className="px-3 pb-1.5 text-xs text-muted-foreground">{title}</p>
      <ul className="space-y-1">
        {items.map((item) => {
          const resolvedHref = resolveNavHref(pathname, activeProjectId, item.href);
          const active = isNavItemActive(pathname, item, resolvedHref);
          const kids = item.children;
          return (
            <NavItemRow
              key={item.label}
              item={item}
              resolvedHref={resolvedHref}
              active={active}
              renderLink={renderLink}
              onNavIntent={onNavIntent}
              onNavigate={onNavigate}
            >
              {active && kids?.length ? (
                <ul className="mt-1 space-y-0.5">
                  {kids.map((child) => {
                    const childActive = isNavChildActive(pathname, child);
                    return (
                      <li key={child.href}>
                        {renderLink({
                          href: child.href,
                          onClick: onNavigate,
                          onMouseEnter: onNavIntent ? () => onNavIntent(child.href) : undefined,
                          onFocus: onNavIntent ? () => onNavIntent(child.href) : undefined,
                          className: cn(
                            "flex w-full items-center gap-1.5 rounded-lg py-1.5 pr-3 pl-9 text-[13px] transition-colors",
                            childActive
                              ? "font-medium text-foreground"
                              : "text-muted-foreground hover:text-foreground",
                          ),
                          children: (
                            <>
                              <span className="min-w-0 truncate">{child.label}</span>
                              {child.badge ? (
                                <span className="ml-auto rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  {child.badge}
                                </span>
                              ) : null}
                            </>
                          ),
                        })}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </NavItemRow>
          );
        })}
      </ul>
    </div>
  );
}

function SidebarPanel({
  pathname,
  activeProjectId,
  userName,
  userEmail,
  userImage,
  userRole,
  orgRole,
  theme,
  projectSwitcher,
  renderLink,
  onToggleTheme,
  onSignOut,
  onNavIntent,
  onNavigate,
  brandExtra,
}: {
  pathname: string;
  activeProjectId: number | null;
  userName: string;
  userEmail: string;
  userImage?: string | null;
  userRole?: string | null;
  orgRole?: string | null;
  theme: "light" | "dark";
  projectSwitcher: ReactNode;
  renderLink: (props: AppShellLinkProps) => ReactNode;
  onToggleTheme?: () => void;
  onSignOut?: () => void;
  onNavIntent?: (href: string) => void;
  onNavigate?: () => void;
  brandExtra?: ReactNode;
}) {
  const { navSections, footerItems } = buildNavModel({ userRole, orgRole });

  return (
    <>
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
        <GoalsBrandMark size={24} className="text-primary" />
        <span className="text-sm font-semibold tracking-tight">goals.ac</span>
        {brandExtra}
      </div>

      <nav className="flex-1 overflow-y-auto overscroll-contain px-2.5 py-4 [scrollbar-width:thin]">
        <div className="mb-5 border-b border-border pb-4">{projectSwitcher}</div>
        {navSections.map((section) => (
          <NavSection
            key={section.label}
            title={section.label}
            items={section.items}
            pathname={pathname}
            activeProjectId={activeProjectId}
            renderLink={renderLink}
            onNavIntent={onNavIntent}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <div className="border-t border-border px-2.5 py-3">
        <ul className="space-y-1">
          {footerItems.map((item) => {
            const resolvedHref = resolveNavHref(pathname, activeProjectId, item.href);
            return (
              <NavItemRow
                key={item.label}
                item={item}
                resolvedHref={resolvedHref}
                active={isNavItemActive(pathname, item, resolvedHref)}
                renderLink={renderLink}
                onNavIntent={onNavIntent}
                onNavigate={onNavigate}
              />
            );
          })}
        </ul>
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-xl bg-secondary/40 px-2.5 py-2.5">
          {userImage ? (
            <img
              src={userImage}
              alt=""
              className="h-8 w-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card text-xs font-semibold text-foreground shadow-sm">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{userName}</p>
            <p className="truncate text-[11px] text-muted-foreground">{userEmail}</p>
          </div>
          {onToggleTheme ? (
            <button
              type="button"
              onClick={onToggleTheme}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          ) : null}
          {onSignOut ? (
            <button
              type="button"
              onClick={onSignOut}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}

export function AppSidebarShell({
  pathname,
  activeProjectId,
  userName,
  userEmail,
  userImage,
  userRole,
  orgRole,
  theme = "light",
  projectSwitcher,
  renderLink,
  onToggleTheme,
  onSignOut,
  onNavIntent,
  mobileOpen: mobileOpenControlled,
  onMobileOpenChange,
}: AppSidebarShellProps) {
  const [mobileOpenUncontrolled, setMobileOpenUncontrolled] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const isControlled = mobileOpenControlled !== undefined;
  const mobileOpen = isControlled ? mobileOpenControlled : mobileOpenUncontrolled;

  const setMobileOpen = useCallback(
    (open: boolean) => {
      if (!isControlled) setMobileOpenUncontrolled(open);
      onMobileOpenChange?.(open);
    },
    [isControlled, onMobileOpenChange],
  );

  const closeMobile = useCallback(() => setMobileOpen(false), [setMobileOpen]);

  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 1023px)");
    const sync = () => setIsNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobile();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, closeMobile]);

  const panelProps = {
    pathname,
    activeProjectId,
    userName,
    userEmail,
    userImage,
    userRole,
    orgRole,
    theme,
    projectSwitcher,
    renderLink,
    onToggleTheme,
    onSignOut,
    onNavIntent,
    onNavigate: closeMobile,
  };

  const drawerInert = isNarrow && !mobileOpen;

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] px-3 lg:hidden">
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
          <span className="truncate text-sm font-semibold tracking-tight">goals.ac</span>
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
          "flex h-full w-62 shrink-0 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)]",
          "fixed inset-y-0 left-0 z-50 transition-[translate] duration-200 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full pointer-events-none",
          "lg:relative lg:z-auto lg:translate-x-0 lg:pointer-events-auto",
        )}
        inert={drawerInert || undefined}
      >
        <SidebarPanel
          {...panelProps}
          brandExtra={
            <button
              type="button"
              onClick={closeMobile}
              className="ml-auto flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          }
        />
      </aside>
    </>
  );
}
