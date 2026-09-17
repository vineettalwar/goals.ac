"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MfaSettingsPanel } from "@/components/mfa/mfa-settings-panel";

type MfaStatus = {
  enabled: boolean;
  required: boolean;
  verified: boolean;
};

// Module cache — MFA status rarely changes; avoid refetch on every soft-nav.
let mfaStatusCache: { status: MfaStatus; at: number } | null = null;
const MFA_STATUS_TTL_MS = 60_000;

function readMfaCache(): MfaStatus | null {
  if (!mfaStatusCache) return null;
  if (Date.now() - mfaStatusCache.at > MFA_STATUS_TTL_MS) {
    mfaStatusCache = null;
    return null;
  }
  return mfaStatusCache.status;
}

function writeMfaCache(status: MfaStatus) {
  mfaStatusCache = { status, at: Date.now() };
}

export function invalidateMfaStatusCache() {
  mfaStatusCache = null;
}

export function MfaComplianceGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, status: sessionStatus, update } = useSession();
  const [status, setStatus] = useState<MfaStatus | null>(() => readMfaCache());
  const [loading, setLoading] = useState(() => readMfaCache() == null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const onSettingsPage = pathname.startsWith("/settings");

  const load = useCallback(async (force = false) => {
    if (!force) {
      const cached = readMfaCache();
      if (cached) {
        setStatus(cached);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/mfa/setup");
      if (!res.ok) return;
      const next = (await res.json()) as MfaStatus;
      writeMfaCache(next);
      setStatus(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      void load(false);
    }
  }, [sessionStatus, load, session?.mfaVerified]);

  async function verifySession() {
    if (!code.trim()) return;
    setVerifying(true);
    setVerifyError(null);
    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setVerifyError(data.error === "invalid_code" ? "Invalid code — try again" : data.error ?? "Verification failed");
        return;
      }
      await update({ mfaVerified: true });
      setCode("");
      invalidateMfaStatusCache();
      await load(true);
    } finally {
      setVerifying(false);
    }
  }

  if (sessionStatus !== "authenticated" || loading || !status) {
    return <>{children}</>;
  }

  const needsSetup = status.required && !status.enabled;
  const needsVerify =
    status.required && status.enabled && !session?.mfaVerified;

  if (needsSetup) {
    if (onSettingsPage) {
      return <>{children}</>;
    }

    return (
      <div className="relative">
        <div className="pointer-events-none select-none opacity-30 blur-[1px]" aria-hidden>
          {children}
        </div>
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 p-6">
          <div className="paper-card max-w-lg w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h2 className="font-semibold">Two-factor authentication required</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Your organization requires 2FA. Set up an authenticator app to continue using goals.ac.
                </p>
              </div>
            </div>
            <MfaSettingsPanel />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      <Dialog open={needsVerify} onOpenChange={() => undefined}>
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Verify your identity</DialogTitle>
            <DialogDescription>
              Enter the 6-digit code from your authenticator app to unlock this session.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="mfa-verify-code">Authentication code</Label>
              <Input
                id="mfa-verify-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\s/g, ""));
                  setVerifyError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && code.length >= 6) void verifySession();
                }}
              />
            </div>
            {verifyError ? <p className="text-sm text-destructive">{verifyError}</p> : null}
            <Button className="w-full" onClick={verifySession} disabled={verifying || code.length < 6}>
              {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
