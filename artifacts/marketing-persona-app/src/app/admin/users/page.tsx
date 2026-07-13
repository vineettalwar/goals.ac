import { requirePlatformAdmin } from "@/lib/require-platform-admin";
import { AdminUsersPageClient } from "./admin-users-page-client";

export default async function AdminUsersPage() {
  await requirePlatformAdmin();
  return <AdminUsersPageClient />;
}
