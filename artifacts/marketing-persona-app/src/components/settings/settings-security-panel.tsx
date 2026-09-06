"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrgSecurityPanel } from "@/components/org/org-security-panel";
import { MfaSettingsPanel } from "@/components/mfa/mfa-settings-panel";

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "At least 8 characters"),
});

interface SecurityPanelProps {
  canManage: boolean;
}

export function SettingsSecurityPanel({ canManage }: SecurityPanelProps) {
  const form = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });

  async function changePassword(data: { currentPassword: string; newPassword: string }) {
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Failed to change password");
      return;
    }
    form.reset();
    toast.success("Password updated");
  }

  return (
    <div className="space-y-6">
      <MfaSettingsPanel />
      <OrgSecurityPanel canManage={canManage} />
      <div className="paper-card p-6 space-y-4">
        <h2 className="font-semibold">Change password</h2>
        <div className="space-y-1.5">
          <Label htmlFor="currentPassword">Current password</Label>
          <Input id="currentPassword" type="password" {...form.register("currentPassword")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="newPassword">New password</Label>
          <Input id="newPassword" type="password" {...form.register("newPassword")} />
        </div>
        <Button variant="outline" onClick={form.handleSubmit(changePassword)}>
          Change password
        </Button>
        <Link href="/forgot-password" className="text-sm text-primary hover:underline block">
          Forgot password?
        </Link>
      </div>
    </div>
  );
}
