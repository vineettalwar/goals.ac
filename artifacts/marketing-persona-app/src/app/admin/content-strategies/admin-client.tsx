"use client";

import { useState } from "react";
import { AdminStrategiesList, AdminStrategyDetail } from "@/components/admin/platform/content-strategies-client";

export function AdminContentStrategiesClient() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (selectedId) {
    return <AdminStrategyDetail strategyId={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return <AdminStrategiesList onSelect={setSelectedId} />;
}
