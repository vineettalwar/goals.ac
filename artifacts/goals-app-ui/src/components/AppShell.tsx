import { useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/auth";

type NavItem = { to: string; label: string; end?: boolean };

const OVERVIEW: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", end: true },
  { to: "/projects", label: "Projects" },
];

const CREATE: NavItem[] = [
  { to: "/studio", label: "Content studio" },
  { to: "/social", label: "Social hub" },
  { to: "/autopilot", label: "Autopilot" },
];

const PLAN: NavItem[] = [{ to: "/strategy", label: "Strategy" }];

const MEASURE: NavItem[] = [
  { to: "/search", label: "Search" },
  { to: "/audit", label: "GEO audit" },
];

const RESEARCH: NavItem[] = [{ to: "/research", label: "Research" }];

const FOOTER: NavItem[] = [
  { to: "/integrations", label: "Integrations" },
  { to: "/help", label: "Help" },
  { to: "/settings", label: "Settings" },
];

function NavSection({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <div className="mb-4">
      <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wide text-(--muted)">{title}</p>
      <div className="flex flex-col gap-0.5">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `rounded-lg px-3 py-2 text-sm ${
                isActive
                  ? "bg-(--forest) text-white"
                  : "text-(--ink) hover:bg-[#f5f3ef]"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

export function AppShell() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.role === "super_admin" || user?.role === "admin";

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true, state: { from: location.pathname } });
    }
  }, [loading, user, navigate, location.pathname]);

  if (loading) {
    return <p className="p-8 text-(--muted)">Loading…</p>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 border-r border-(--border) bg-white px-3 py-6 shrink-0 overflow-y-auto">
        <div className="px-1 mb-6">
          <p className="text-lg font-semibold text-(--forest)">goals.ac</p>
          <p className="text-xs text-(--muted)">Product</p>
        </div>
        <nav>
          <NavSection title="Overview" items={OVERVIEW} />
          <NavSection title="Create" items={CREATE} />
          <NavSection title="Plan" items={PLAN} />
          <NavSection title="Measure" items={MEASURE} />
          <NavSection title="Research" items={RESEARCH} />
          <NavSection title="Account" items={FOOTER} />
          {isAdmin ? (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm mb-4 ${
                  isActive ? "bg-(--forest) text-white" : "text-(--ink) hover:bg-[#f5f3ef]"
                }`
              }
            >
              Admin
            </NavLink>
          ) : null}
        </nav>
        {user ? (
          <p className="px-1 mt-4 text-xs text-(--muted) truncate">{user.email}</p>
        ) : null}
      </aside>
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
