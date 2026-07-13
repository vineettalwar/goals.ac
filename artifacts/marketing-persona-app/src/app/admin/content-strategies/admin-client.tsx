"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminStrategiesList, AdminStrategyDetail } from "@/components/admin/content-strategies-client";

export function AdminContentStrategiesClient() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin: Content Strategies</h1>
          <p className="text-sm text-muted-foreground mt-1">Prepare, generate, and schedule strategy items</p>
        </div>
        <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">← Admin</Link>
      </div>

      {selectedId ? (
        <AdminStrategyDetail strategyId={selectedId} onBack={() => setSelectedId(null)} />
      ) : (
        <AdminStrategiesList onSelect={setSelectedId} />
      )}
    </div>
  );
}
