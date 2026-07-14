import { AdminInviteUserCard } from "@/components/admin/admin-invite-user-card";
import { AdminPendingInvitesPanel } from "@/components/admin/admin-pending-invites-panel";

export default function AdminUsersInvitePage() {
  return (
    <div className="max-w-4xl space-y-10">
      <div className="max-w-2xl">
        <AdminInviteUserCard />
      </div>
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Pending invitations</h2>
          <p className="text-sm text-muted-foreground">
            Outstanding invites that have not been accepted yet.
          </p>
        </div>
        <AdminPendingInvitesPanel />
      </section>
    </div>
  );
}
