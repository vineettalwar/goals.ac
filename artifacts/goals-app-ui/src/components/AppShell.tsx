import { useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  APP_SHELL_GUTTER,
  APP_SHELL_MAIN_OFFSET,
  APP_SHELL_STAGE,
  AppSidebarShell,
  projectIdFromPathname,
} from "@workspace/app-shell";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/context/theme";
import { useActiveProject } from "@/hooks/use-active-project";
import { ProjectSwitcher } from "@/components/ProjectSwitcher";
import { MfaComplianceGate } from "@/components/mfa/MfaComplianceGate";

export function AppShell() {
  const { user, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
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

  if (loading || !user) {
    return (
      <p className="p-8 text-muted-foreground">
        {loading ? "Loading…" : "Redirecting to sign in…"}
      </p>
    );
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
        theme={theme}
        onToggleTheme={toggleTheme}
        projectSwitcher={<ProjectSwitcher />}
        onSignOut={() => void logout().then(() => navigate("/login", { replace: true }))}
        renderLink={({ href, className, children, onClick, onMouseEnter, onFocus }) => (
          <Link
            to={href}
            className={className}
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onFocus={onFocus}
          >
            {children}
          </Link>
        )}
      />
      <div className={`${APP_SHELL_GUTTER} ${APP_SHELL_MAIN_OFFSET}`}>
        <MfaComplianceGate>
          <main className={APP_SHELL_STAGE}>
            <Outlet />
          </main>
        </MfaComplianceGate>
      </div>
    </div>
  );
}
