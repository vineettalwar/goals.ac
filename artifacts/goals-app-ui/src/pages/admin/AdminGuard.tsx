import { Navigate } from "react-router-dom";
import { isSuperAdmin } from "@workspace/app-shell";
import { useAuth } from "@/context/auth";
import type { ReactNode } from "react";

export function AdminGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!user || !isSuperAdmin(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
