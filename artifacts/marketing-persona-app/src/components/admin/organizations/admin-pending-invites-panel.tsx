"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PendingInvite {
  id: number;
  email: string;
  kind: "member" | "firm";
  organizationId: number | null;
  organizationName: string | null;
  role: string;
  assignedProjectId: number | null;
  prefill: { orgName?: string; vertical?: string; websiteUrl?: string; plan?: string } | null;
  expiresAt: string;
  createdAt: string;
  revokedAt: string | null;
  sendCount: number;
  lastSentAt: string | null;
}

export function AdminPendingInvitesPanel({ refreshKey }: { refreshKey?: number } = {}) {
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState<number | null>(null);

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
  }, [loadInvites, refreshKey]);

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

  async function resendInvite(inviteId: number) {
    setResendingId(inviteId);
    try {
      const res = await fetch(`/api/admin/invites/${inviteId}/resend`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to resend invite");
      if (data.emailSent) {
        toast.success("Invitation resent");
      } else if (data.inviteUrl) {
        await navigator.clipboard.writeText(data.inviteUrl as string);
        toast.message("Email not configured — invite link copied to clipboard");
      } else {
        toast.success("Invitation refreshed");
      }
      await loadInvites();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resend invitation");
    } finally {
      setResendingId(null);
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
            <th className="px-4 py-3 font-medium">Kind</th>
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
              <td className="px-4 py-3">
                {invite.email}
                {invite.sendCount > 1 && (
                  <span className="ml-2 text-xs text-muted-foreground">sent {invite.sendCount}×</span>
                )}
              </td>
              <td className="px-4 py-3">
                <Badge variant={invite.kind === "firm" ? "default" : "outline"} className="capitalize">
                  {invite.kind}
                </Badge>
              </td>
              <td className="px-4 py-3">
                {invite.organizationId ? (
                  <Link href={`/admin/organizations/${invite.organizationId}`} className="hover:underline">
                    {invite.organizationName}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">
                    {invite.prefill?.orgName || "New firm (name pending)"}
                  </span>
                )}
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
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={resendingId === invite.id}
                    onClick={() => void resendInvite(invite.id)}
                  >
                    {resendingId === invite.id ? "Resending…" : "Resend"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => void revokeInvite(invite.id)}>
                    Revoke
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
