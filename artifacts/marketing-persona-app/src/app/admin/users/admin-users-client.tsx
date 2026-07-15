"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminImpersonation } from "@/hooks/use-admin-impersonation";
import { useAdminOrganizations } from "@/lib/queries";

interface UserRow {
  id: number;
  email: string;
  name: string;
  platformRole: string;
  plan: string;
  organizationId: number | null;
  organizationName: string | null;
  orgRole: string | null;
  projectCount: number;
  createdAt: string;
  status: "active" | "pending_invite" | "no_org";
}

interface OrganizationOption {
  id: number;
  name: string;
}

const STATUS_LABELS: Record<UserRow["status"], string> = {
  active: "Active",
  pending_invite: "Pending invite",
  no_org: "No org",
};

export function AdminUsersClient() {
  const { impersonateUser, isImpersonating } = useAdminImpersonation();
  const { data: organizations = [] } = useAdminOrganizations();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [organizationId, setOrganizationId] = useState("all");
  const [platformRole, setPlatformRole] = useState("all");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (organizationId !== "all") params.set("organizationId", organizationId);
      if (platformRole !== "all") params.set("platformRole", platformRole);
      params.set("limit", "100");

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load users");
      const data = (await res.json()) as { users: UserRow[]; total: number };
      setUsers(data.users);
      setTotal(data.total);
    } catch {
      toast.error("Could not load users");
    } finally {
      setLoading(false);
    }
  }, [search, organizationId, platformRole]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadUsers();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadUsers]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={organizationId} onValueChange={setOrganizationId}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="All organizations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All organizations</SelectItem>
            {organizations.map((org) => (
              <SelectItem key={org.id} value={String(org.id)}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={platformRole} onValueChange={setPlatformRole}>
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platform roles</SelectItem>
            <SelectItem value="user">user</SelectItem>
            <SelectItem value="admin">admin</SelectItem>
            <SelectItem value="super_admin">super_admin</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground sm:ml-auto">{total} users</p>
      </div>

      <div className="paper-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Platform</th>
                <th className="px-4 py-3 font-medium">Organization</th>
                <th className="px-4 py-3 font-medium">Org role</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Projects</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                    Loading users…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{user.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3">{user.platformRole}</td>
                    <td className="px-4 py-3">
                      {user.organizationName ? (
                        <Link
                          href="/admin/organizations"
                          className="hover:text-primary hover:underline"
                        >
                          {user.organizationName}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">{user.orgRole ?? "—"}</td>
                    <td className="px-4 py-3">{user.plan}</td>
                    <td className="px-4 py-3">{user.projectCount}</td>
                    <td className="px-4 py-3">
                      <Badge variant={user.status === "active" ? "default" : "secondary"}>
                        {STATUS_LABELS[user.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {user.platformRole !== "super_admin" && user.platformRole !== "admin" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isImpersonating(user.id)}
                          onClick={() => void impersonateUser(user.id)}
                        >
                          {isImpersonating(user.id) ? "Starting…" : "View as user"}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
