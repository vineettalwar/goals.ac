"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SettingsAccountPanel() {
  const [deleting, setDeleting] = useState(false);

  async function deleteAccount() {
    if (!confirm("Delete your account and all projects? This cannot be undone.")) return;
    setDeleting(true);
    const res = await fetch("/api/auth/me/delete", { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) { toast.error("Failed to delete account"); return; }
    window.location.href = "/login";
  }

  return (
    <div className="paper-card p-6 space-y-4 border-destructive/30">
      <h2 className="font-semibold text-destructive">Danger zone</h2>
      <p className="text-sm text-muted-foreground">
        Permanently delete your account and all associated data.
      </p>
      <Button variant="destructive" onClick={deleteAccount} disabled={deleting}>
        {deleting ? "Deleting…" : "Delete account"}
      </Button>
    </div>
  );
}
