import { memo, type ReactNode } from "react";
import { Leaf, LogOut, Moon, Sun } from "lucide-react";
import { cn } from "./cn";
import { buildNavModel, type NavItemDef } from "./nav-config";
import { isNavItemActive, resolveNavHref } from "./nav-routing";

export type AppShellLinkProps = {
  href: string;
  className: string;
  children: ReactNode;
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
};

const NavItemRow = memo(function NavItemRow({
  item,
  resolvedHref,
  active,
  renderLink,
  onNavIntent,
}: {
  item: NavItemDef;
  resolvedHref: string;
  active: boolean;
  renderLink: (props: AppShellLinkProps) => ReactNode;
  onNavIntent?: (href: string) => void;
}) {
  const Icon = item.icon;
  return (
    <li>
      {renderLink({
        href: resolvedHref,
        onMouseEnter: onNavIntent ? () => onNavIntent(resolvedHref) : undefined,
        onFocus: onNavIntent ? () => onNavIntent(resolvedHref) : undefined,
        className: cn(
          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
          active
            ? "bg-secondary font-medium text-foreground"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        ),
        children: (
          <>
            <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "")} />
            {item.label}
          </>
        ),
      })}
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
}: {
  title: string;
  items: NavItemDef[];
  pathname: string;
  activeProjectId: number | null;
  renderLink: (props: AppShellLinkProps) => ReactNode;
  onNavIntent?: (href: string) => void;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const resolvedHref = resolveNavHref(pathname, activeProjectId, item.href);
          return (
            <NavItemRow
              key={item.label}
              item={item}
              resolvedHref={resolvedHref}
              active={isNavItemActive(pathname, item, resolvedHref)}
              renderLink={renderLink}
              onNavIntent={onNavIntent}
            />
          );
        })}
      </ul>
    </div>
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
}: AppSidebarShellProps) {
  const { navSections, footerItems } = buildNavModel({ userRole, orgRole });

  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
          <Leaf className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold tracking-tight">goals.ac</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <div className="mb-4 border-b border-border pb-3">{projectSwitcher}</div>
        {navSections.map((section) => (
          <NavSection
            key={section.label}
            title={section.label}
            items={section.items}
            pathname={pathname}
            activeProjectId={activeProjectId}
            renderLink={renderLink}
            onNavIntent={onNavIntent}
          />
        ))}
      </nav>

      <div className="border-t border-border px-2 py-2">
        <ul className="space-y-0.5">
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
              />
            );
          })}
        </ul>
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          {userImage ? (
            <img
              src={userImage}
              alt=""
              className="h-7 w-7 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{userName}</p>
            <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
          </div>
          {onToggleTheme ? (
            <button
              type="button"
              onClick={onToggleTheme}
              className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          ) : null}
          {onSignOut ? (
            <button
              type="button"
              onClick={onSignOut}
              className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
