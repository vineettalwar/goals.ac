import { useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppSidebarShell, projectIdFromPathname } from "@workspace/app-shell";
import { useAuth } from "@/context/auth";
import { useActiveProject } from "@/hooks/use-active-project";
import { ProjectSwitcher } from "@/components/ProjectSwitcher";

export function AppShell() {
  const { user, loading, logout } = useAuth();
  const { projectId: activeProjectIdRaw } = useActiveProject();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  const activeProjectIdFromContext = activeProjectIdRaw
    ? Number.parseInt(activeProjectIdRaw, 10)
    : NaN;
  const activeProjectId =
    (Number.isFinite(activeProjectIdFromContext) ? activeProjectIdFromContext : null) ??
    projectIdFromPathname(pathname);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true, state: { from: pathname } });
    }
  }, [loading, user, navigate, pathname]);

  if (loading) {
    return <p className="p-8 text-muted-foreground">Loading…</p>;
  }

  if (!user) {
    return null;
  }

  const displayName = user.name?.trim() || user.email;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebarShell
        pathname={pathname}
        activeProjectId={activeProjectId}
        userName={displayName}
        userEmail={user.email}
        userImage={user.avatarUrl}
        userRole={user.role}
        projectSwitcher={<ProjectSwitcher />}
        onSignOut={() => void logout().then(() => navigate("/login", { replace: true }))}
        renderLink={({ href, className, children, onMouseEnter, onFocus }) => (
          <Link
            to={href}
            className={className}
            onMouseEnter={onMouseEnter}
            onFocus={onFocus}
          >
            {children}
          </Link>
        )}
      />
      <main className="min-w-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        <Outlet />
      </main>
    </div>
  );
}
