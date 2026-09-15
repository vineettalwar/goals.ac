import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { MfaSettingsPanel } from "@/components/mfa/MfaSettingsPanel";

type MfaStatus = {
  enabled: boolean;
  required: boolean;
  verified: boolean;
};

export function MfaComplianceGate({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const onSettingsPage = pathname.startsWith("/settings");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<MfaStatus>("/api/auth/mfa/setup");
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function verifySession() {
    if (!code.trim()) return;
    setVerifying(true);
    setVerifyError(null);
    try {
      await apiFetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      setCode("");
      await load();
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  }

  if (loading || !status) {
    return <>{children}</>;
  }

  const needsSetup = status.required && !status.enabled;
  const needsVerify = status.required && status.enabled && !status.verified;

  if (needsSetup) {
    if (onSettingsPage) {
      return <>{children}</>;
    }

    return (
      <div className="relative">
        <div className="pointer-events-none select-none opacity-30 blur-px" aria-hidden>
          {children}
        </div>
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 p-6">
          <div className="paper-card w-full max-w-lg space-y-4 p-6">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-600" />
              <div>
                <h2 className="font-semibold">Two-factor authentication required</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your organization requires 2FA. Set up an authenticator app to continue using
                  goals.ac.
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
      {needsVerify ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6">
          <div className="paper-card w-full max-w-md space-y-4 p-6">
            <div>
              <h2 className="font-semibold">Verify your identity</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter the 6-digit code from your authenticator app to unlock this session.
              </p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="mfa-verify-code" className="text-sm font-medium">
                Authentication code
              </label>
              <input
                id="mfa-verify-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.replace(/\s/g, ""));
                  setVerifyError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && code.length >= 6) void verifySession();
                }}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            {verifyError ? <p className="text-sm text-destructive">{verifyError}</p> : null}
            <button
              type="button"
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              onClick={() => void verifySession()}
              disabled={verifying || code.length < 6}
            >
              {verifying ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Verify"}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
