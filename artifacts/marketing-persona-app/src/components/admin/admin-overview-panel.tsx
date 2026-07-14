import Link from "next/link";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PLAN_LABELS, type PlanId } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";
import type { AdminOverview } from "@/lib/org/admin-overview";

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
    accent: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-500/10",
  },
  {
    label: "Organizations",
    key: "organizationCount",
    href: "/admin/organizations",
    icon: Building2,
    accent: "text-violet-600 dark:text-violet-400",
    iconBg: "bg-violet-500/10",
  },
  {
    label: "Projects",
    key: "projectCount",
    href: "/projects",
    icon: FolderKanban,
    accent: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-500/10",
  },
  {
    label: "Pending invites",
    key: "pendingInviteCount",
    href: "/admin/users/invite",
    icon: Mail,
    accent: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-500/10",
  },
  {
    label: "Suspended",
    key: "suspendedOrgCount",
    href: "/admin/organizations",
    icon: ShieldAlert,
    accent: "text-destructive",
    iconBg: "bg-destructive/10",
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
  const source = name.trim() || email.trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function UserAvatar({ name, email }: { name: string; email: string }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-xs font-semibold text-blue-700 dark:text-blue-300">
      {initials(name, email)}
    </div>
  );
}

function OrgAvatar({ name }: { name: string }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-xs font-semibold text-violet-700 dark:text-violet-300">
      {name.trim().slice(0, 2).toUpperCase()}
    </div>
  );
}

function ViewAllLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      View all
      <ArrowRight className="h-3 w-3" />
    </Link>
  );
}

export function AdminOverviewPanel({ data }: { data: AdminOverview }) {
  const { stats, attention, recentUsers, recentOrganizations } = data;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {STAT_ITEMS.map((item) => {
          const value = stats[item.key];
          const isAlert = item.alert && value > 0;
          const Icon = item.icon;

          return (
            <Link key={item.label} href={item.href} className="group">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg",
                        isAlert ? "bg-destructive/10" : item.iconBg,
                      )}
                    >
                      <Icon
                        className={cn("h-5 w-5", isAlert ? "text-destructive" : item.accent)}
                      />
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/0 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                  </div>
                  <p
                    className={cn(
                      "mt-4 text-3xl font-semibold tabular-nums tracking-tight",
                      isAlert && "text-destructive",
                    )}
                  >
                    {value}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {attention.length > 0 ? (
        <Card className="border-amber-500/20 bg-amber-500/3">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Needs attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {attention.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm transition-colors",
                  item.tone === "destructive"
                    ? "border-destructive/25 bg-destructive/5 text-destructive hover:bg-destructive/10"
                    : "border-amber-500/20 bg-background/60 hover:bg-background",
                )}
              >
                <span>{item.label}</span>
                <ArrowRight className="h-4 w-4 shrink-0 opacity-60" />
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-base">Recent users</CardTitle>
              <CardDescription>Latest signups and invites</CardDescription>
            </div>
            <ViewAllLink href="/admin/users" />
          </CardHeader>
          <CardContent className="pt-0">
            {recentUsers.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No users yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recentUsers.map((user) => (
                  <li key={user.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <UserAvatar name={user.name} email={user.email} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{user.name || user.email}</p>
                        {user.status === "pending_invite" ? (
                          <Badge variant="warning" className="text-[10px]">
                            Pending
                          </Badge>
                        ) : null}
                        {user.status === "no_org" ? (
                          <Badge variant="muted" className="text-[10px]">
                            No org
                          </Badge>
                        ) : null}
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {user.organizationName ?? user.email}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-base">Recent organizations</CardTitle>
              <CardDescription>Newly created workspaces</CardDescription>
            </div>
            <ViewAllLink href="/admin/organizations" />
          </CardHeader>
          <CardContent className="pt-0">
            {recentOrganizations.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No organizations yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recentOrganizations.map((org) => (
                  <li key={org.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <OrgAvatar name={org.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{org.name}</p>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {PLAN_LABELS[org.plan as PlanId] ?? org.plan}
                        </Badge>
                        {org.suspendedAt ? (
                          <Badge variant="destructive" className="text-[10px]">
                            Suspended
                          </Badge>
                        ) : null}
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {org.ownerName} · {org.memberCount} members · {org.projectCount} projects
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(org.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
