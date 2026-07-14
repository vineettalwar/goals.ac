"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PendingInvite {
  id: number;
  email: string;
  organizationId: number;
  organizationName: string;
  role: string;
  assignedProjectId: number | null;
  expiresAt: string;
  createdAt: string;
}

export function AdminPendingInvitesPanel() {
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const loadInvites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/invites");
      if (!res.ok) throw new Error("Failed to load invites");
      const data = (await res.json()) as { invites: PendingInvite[] };
      setInvites(data.invites);
    } catch {
      toast.error("Could not load pending invites");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInvites();
  }, [loadInvites]);

  async function revokeInvite(inviteId: number) {
    try {
      const res = await fetch(`/api/admin/invites/${inviteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke invite");
      toast.success("Invitation revoked");
      await loadInvites();
    } catch {
      toast.error("Could not revoke invitation");
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading pending invites…</p>;
  }

  if (invites.length === 0) {
    return <p className="text-sm text-muted-foreground">No pending invitations.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="min-w-full text-sm">
        <thead className="border-b border-border bg-muted/40 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Organization</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Sent</th>
            <th className="px-4 py-3 font-medium">Expires</th>
            <th className="px-4 py-3 font-medium" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {invites.map((invite) => (
            <tr key={invite.id}>
              <td className="px-4 py-3">{invite.email}</td>
              <td className="px-4 py-3">
                <Link
                  href={`/admin/organizations/${invite.organizationId}`}
                  className="hover:underline"
                >
                  {invite.organizationName}
                </Link>
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline" className="capitalize">
                  {invite.role.replace(/_/g, " ")}
                </Badge>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(invite.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(invite.expiresAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-right">
                <Button variant="ghost" size="sm" onClick={() => void revokeInvite(invite.id)}>
                  Revoke
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
