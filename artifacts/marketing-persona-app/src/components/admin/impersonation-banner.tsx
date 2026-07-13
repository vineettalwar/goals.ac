"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ImpersonationBanner() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [stopping, setStopping] = useState(false);

  if (!session?.impersonation) return null;

  async function stopImpersonation() {
    setStopping(true);
    try {
      await fetch("/api/admin/impersonate", { method: "DELETE" });
      await update({ stopImpersonation: true });
      router.push("/admin/users");
      router.refresh();
    } finally {
      setStopping(false);
    }
  }

  return (
    <div className="sticky top-0 z-50 border-b border-amber-500/40 bg-amber-500/10 px-4 py-2">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <p className="text-sm">
          Viewing as <strong>{session.user.name}</strong> ({session.user.email})
          <span className="text-muted-foreground">
            {" "}
            — admin: {session.impersonation.adminName}
          </span>
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void stopImpersonation()}
          disabled={stopping}
        >
          {stopping ? "Exiting…" : "Exit view"}
        </Button>
      </div>
    </div>
  );
}
