"use client";

import { useEffect, useState } from "react";

interface PlatformStats {
  userCount: number;
  organizationCount: number;
  projectCount: number;
  suspendedOrgCount: number;
  pendingInviteCount: number;
}

export function AdminStatsStrip() {
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    void fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data: { stats: PlatformStats }) => setStats(data.stats))
      .catch(() => undefined);
  }, []);

  if (!stats) {
    return <p className="text-sm text-muted-foreground">Loading platform stats…</p>;
  }

  const items = [
    { label: "Users", value: stats.userCount },
    { label: "Organizations", value: stats.organizationCount },
    { label: "Projects", value: stats.projectCount },
    { label: "Pending invites", value: stats.pendingInviteCount },
    { label: "Suspended orgs", value: stats.suspendedOrgCount },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="paper-card p-3 text-center">
          <p className="text-2xl font-semibold">{item.value}</p>
          <p className="text-xs text-muted-foreground">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
