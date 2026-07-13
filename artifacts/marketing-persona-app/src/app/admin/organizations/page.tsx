import { requirePlatformAdmin } from "@/lib/require-platform-admin";
import { AdminOrganizationsClient } from "./admin-organizations-client";

export default async function AdminOrganizationsPage() {
  await requirePlatformAdmin();
  return <AdminOrganizationsClient />;
}
