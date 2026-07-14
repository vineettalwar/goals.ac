"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MfaStatus = {
  enabled: boolean;
  required: boolean;
  verified: boolean;
  pendingSetup: boolean;
};

type SetupPayload = {
  secret: string;
  authUri: string;
};

export function MfaSettingsPanel() {
  const { update } = useSession();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [setup, setSetup] = useState<SetupPayload | null>(null);
  const [code, setCode] = useState("");
  const [starting, setStarting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/mfa/setup");
      if (!res.ok) return;
      setStatus(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function startSetup() {
    setStarting(true);
    try {
      const res = await fetch("/api/auth/mfa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed to start MFA setup");
        return;
      }
      setSetup({ secret: data.secret, authUri: data.authUri });
      setCode("");
    } finally {
      setStarting(false);
    }
  }

  async function confirmSetup() {
    if (!code.trim()) return;
    setConfirming(true);
    try {
      const res = await fetch("/api/auth/mfa/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error === "invalid_code" ? "Invalid code — try again" : data.error ?? "Confirmation failed");
        return;
      }
      await update({ mfaVerified: true });
      toast.success("Two-factor authentication enabled");
      setSetup(null);
      setCode("");
      await load();
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <div className="paper-card p-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading two-factor settings…
      </div>
    );
  }

  return (
    <div className="paper-card p-6 space-y-4">
      <div className="flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div className="space-y-1">
          <h2 className="font-semibold">Two-factor authentication</h2>
          <p className="text-sm text-muted-foreground">
            Protect your account with a TOTP app such as Google Authenticator, 1Password, or Authy.
            {status?.required ? " Your organization requires 2FA." : ""}
          </p>
        </div>
      </div>

      {status?.enabled ? (
        <div className="flex items-center gap-2 text-sm text-emerald-600">
          <CheckCircle2 className="h-4 w-4" />
          Two-factor authentication is enabled on your account.
        </div>
      ) : setup ? (
        <div className="space-y-4 rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            Scan the QR code with your authenticator app, then enter the 6-digit code to confirm.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(setup.authUri)}`}
              alt="Authenticator QR code"
              width={180}
              height={180}
              className="rounded-md border bg-white"
            />
            <div className="space-y-2 text-sm">
              <p className="font-medium">Manual entry</p>
              <code className="block break-all rounded bg-muted px-2 py-1 text-xs">{setup.secret}</code>
            </div>
          </div>
          <div className="space-y-1.5 max-w-xs">
            <Label htmlFor="mfa-setup-code">Verification code</Label>
            <Input
              id="mfa-setup-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\s/g, ""))}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={confirmSetup} disabled={confirming || code.length < 6}>
              {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm and enable"}
            </Button>
            <Button variant="outline" onClick={() => setSetup(null)} disabled={confirming}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button onClick={startSetup} disabled={starting}>
          {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set up authenticator app"}
        </Button>
      )}
    </div>
  );
}
