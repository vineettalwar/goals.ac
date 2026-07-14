import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/context/auth";

const nav = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/projects", label: "Projects" },
  { to: "/settings", label: "Settings" },
];

export function AppShell() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 border-r border-(--border) bg-white px-4 py-6">
        <div className="mb-8">
          <p className="text-lg font-semibold text-(--forest)">goals.ac</p>
          <p className="text-xs text-(--muted)">Product</p>
        </div>
        <nav className="flex flex-col gap-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
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
        </nav>
        {user ? (
          <p className="mt-8 text-xs text-(--muted) truncate">{user.email}</p>
        ) : null}
      </aside>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
