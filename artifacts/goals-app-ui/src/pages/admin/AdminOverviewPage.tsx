import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  FolderKanban,
  Mail,
  ShieldAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@workspace/app-shell";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/queries/keys";

type AdminOverview = {
  stats: {
    userCount: number;
    organizationCount: number;
    projectCount: number;
    suspendedOrgCount: number;
    pendingInviteCount: number;
  };
  attention: Array<{ label: string; href: string; tone: "warning" | "destructive" }>;
  recentUsers: Array<{
    id: number;
    name: string;
    email: string;
    organizationName: string | null;
    createdAt: string;
    status: string;
  }>;
  recentOrganizations: Array<{
    id: number;
    name: string;
    plan: string;
    ownerName: string;
    memberCount: number;
    projectCount: number;
    createdAt: string;
    suspendedAt: string | null;
  }>;
};

const STAT_ITEMS: {
  label: string;
  key: keyof AdminOverview["stats"];
  href: string;
  icon: LucideIcon;
  accent: string;
  iconBg: string;
  alert?: boolean;
}[] = [
  {
    label: "Users",
    key: "userCount",
    href: "/admin/users",
    icon: Users,
    accent: "text-blue-600",
    iconBg: "bg-blue-500/10",
  },
  {
    label: "Organizations",
    key: "organizationCount",
    href: "/admin/organizations",
    icon: Building2,
    accent: "text-violet-600",
    iconBg: "bg-violet-500/10",
  },
  {
    label: "Projects",
    key: "projectCount",
    href: "/projects",
    icon: FolderKanban,
    accent: "text-emerald-600",
    iconBg: "bg-emerald-500/10",
  },
  {
    label: "Pending invites",
    key: "pendingInviteCount",
    href: "/admin/users/invite",
    icon: Mail,
    accent: "text-amber-600",
    iconBg: "bg-amber-500/10",
  },
  {
    label: "Suspended",
    key: "suspendedOrgCount",
    href: "/admin/organizations",
    icon: ShieldAlert,
    accent: "text-red-600",
    iconBg: "bg-red-500/10",
    alert: true,
  },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function initials(name: string, email: string): string {
  const source = (name.trim() || email.trim());
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function AdminOverviewPage() {
  const query = useQuery({
    queryKey: queryKeys.adminOverview,
    queryFn: () => apiFetch<AdminOverview>("/api/admin/overview"),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const data = query.data;
  const loading = query.isPending && !data;
  const error =
    query.error instanceof Error
      ? query.error.message
      : query.error
        ? "Failed to load admin overview"
        : null;

  return (
    <div className="space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform health, user activity, and quick access to key sections.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg border bg-secondary/30" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : data ? (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {STAT_ITEMS.map((item) => {
              const value = data.stats[item.key];
              const isAlert = item.alert && value > 0;
              const Icon = item.icon;

              return (
                <Link key={item.label} to={item.href} className="group">
                  <div className={cn("h-full rounded-lg border bg-card p-5 transition-shadow hover:shadow-md", isAlert && "border-red-300")}>
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg",
                          isAlert ? "bg-red-500/10" : item.iconBg,
                        )}
                      >
                        <Icon className={cn("h-5 w-5", isAlert ? "text-red-600" : item.accent)} />
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-transparent transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                    </div>
                    <p className={cn("mt-4 text-3xl font-semibold tabular-nums", isAlert && "text-red-600")}>
                      {value}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
                  </div>
                </Link>
              );
            })}
          </div>

          {data.attention.length > 0 ? (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Needs attention
              </h2>
              <ul className="mt-3 space-y-2">
                {data.attention.map((item) => (
                  <li key={item.label}>
                    <Link
                      to={item.href}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm transition-colors",
                        item.tone === "destructive"
                          ? "border-red-500/25 bg-red-500/5 text-red-700 hover:bg-red-500/10"
                          : "border-amber-500/20 bg-background/60 hover:bg-background",
                      )}
                    >
                      <span>{item.label}</span>
                      <ArrowRight className="h-4 w-4 shrink-0 opacity-60" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-lg border bg-card p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">Recent users</h2>
                  <p className="text-sm text-muted-foreground">Latest signups and invites</p>
                </div>
                <Link to="/admin/users" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              {data.recentUsers.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No users yet.</p>
              ) : (
                <ul className="divide-y">
                  {data.recentUsers.map((user) => (
                    <li key={user.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-xs font-semibold text-blue-700">
                        {initials(user.name, user.email)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{user.name || user.email}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {user.organizationName ?? user.email}
                          {user.status === "pending_invite" ? " · pending" : ""}
                          {user.status === "no_org" ? " · no org" : ""}
                        </p>
                      </div>
                      <p className="shrink-0 text-xs text-muted-foreground">{formatDate(user.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-lg border bg-card p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">Recent organizations</h2>
                  <p className="text-sm text-muted-foreground">Newly created workspaces</p>
                </div>
                <Link to="/admin/organizations" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              {data.recentOrganizations.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No organizations yet.</p>
              ) : (
                <ul className="divide-y">
                  {data.recentOrganizations.map((org) => (
                    <li key={org.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-xs font-semibold text-violet-700">
                        {org.name.trim().slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {org.name}
                          {org.suspendedAt ? (
                            <span className="ml-1.5 text-xs font-normal text-red-600">suspended</span>
                          ) : null}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {org.ownerName} · {org.plan} · {org.memberCount} members
                        </p>
                      </div>
                      <p className="shrink-0 text-xs text-muted-foreground">{formatDate(org.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}
