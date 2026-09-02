"use client";

import { useState } from "react";
import { AdminInviteUserCard } from "@/components/admin/organizations/admin-invite-user-card";
import { AdminInviteFirmCard } from "@/components/admin/organizations/admin-invite-firm-card";
import { AdminPendingInvitesPanel } from "@/components/admin/organizations/admin-pending-invites-panel";

export function AdminInvitesPageContent() {
  const [refreshKey, setRefreshKey] = useState(0);
  const bumpRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="max-w-4xl space-y-10">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="paper-card p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Invite a firm</h2>
            <p className="text-sm text-muted-foreground">
              Onboard a brand-new firm that isn&apos;t on the platform yet.
            </p>
          </div>
          <AdminInviteFirmCard onSent={bumpRefresh} />
        </div>
        <div className="paper-card p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Invite a team member</h2>
            <p className="text-sm text-muted-foreground">
              Add someone to an organization that already exists on the platform.
            </p>
          </div>
          <AdminInviteUserCard />
        </div>
      </div>
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Pending invitations</h2>
          <p className="text-sm text-muted-foreground">
            Outstanding invites that have not been accepted yet.
          </p>
        </div>
        <AdminPendingInvitesPanel refreshKey={refreshKey} />
      </section>
    </div>
  );
}
