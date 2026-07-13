import { requirePlatformAdmin } from "@/lib/require-platform-admin";
import { AdminContentStrategiesClient } from "./admin-client";

export default async function AdminContentStrategiesPage() {
  await requirePlatformAdmin();
  return <AdminContentStrategiesClient />;
}
