"use client";

import Link from "next/link";
import { AdminUsersClient } from "./admin-users-client";
import { ImpersonationBanner } from "@/components/admin/impersonation-banner";

export function AdminUsersPageClient() {
  return (
    <>
      <ImpersonationBanner />
      <div className="max-w-6xl mx-auto px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Users — God View</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Cross-tenant user directory with impersonation
            </p>
          </div>
          <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
            ← Admin
          </Link>
        </div>
        <AdminUsersClient />
      </div>
    </>
  );
}
