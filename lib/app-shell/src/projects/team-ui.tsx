export type OrgMemberRow = {
  userId: number;
  email: string;
  name: string;
  role: string;
  joinedAt: string | null;
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  site_admin: "Site admin",
  editor: "Editor",
  viewer: "Viewer",
  member: "Editor",
};

function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

function formatJoinedAt(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function TeamManagementView({
  members,
  loading,
  error,
}: {
  members: OrgMemberRow[];
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="paper-card mb-6 p-5">
      <h2 className="text-sm font-semibold">Team access</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Owners and site admins manage all projects. Editors can create and publish content. Viewers
        are read-only.
      </p>

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

      <div className="mt-4 overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                Email
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                Role
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                Joined
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-sm text-muted-foreground">
                  Loading team…
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-sm text-muted-foreground">
                  No team members yet.
                </td>
              </tr>
            ) : (
              members.map((member, index) => (
                <tr
                  key={member.userId}
                  className={index < members.length - 1 ? "border-b border-border" : ""}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{member.name || member.email}</p>
                    {member.name ? (
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{roleLabel(member.role)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatJoinedAt(member.joinedAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
