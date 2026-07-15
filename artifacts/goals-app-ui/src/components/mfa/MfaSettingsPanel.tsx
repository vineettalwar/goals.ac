import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/auth";
import { apiFetch } from "@/lib/api";

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
  const { refresh } = useAuth();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [setup, setSetup] = useState<SetupPayload | null>(null);
  const [code, setCode] = useState("");
  const [starting, setStarting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

  async function startSetup() {
    setStarting(true);
    setMessage(null);
    try {
      const data = await apiFetch<SetupPayload & { error?: string }>("/api/auth/mfa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setSetup({ secret: data.secret, authUri: data.authUri });
      setCode("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to start MFA setup");
    } finally {
      setStarting(false);
    }
  }

  async function confirmSetup() {
    if (!code.trim()) return;
    setConfirming(true);
    setMessage(null);
    try {
      await apiFetch("/api/auth/mfa/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      await refresh();
      setSetup(null);
      setCode("");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Confirmation failed");
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <div className="paper-card flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading two-factor settings…
      </div>
    );
  }

  return (
    <div className="paper-card space-y-4 p-6">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="space-y-1">
          <h2 className="font-semibold">Two-factor authentication</h2>
          <p className="text-sm text-muted-foreground">
            Protect your account with a TOTP app such as Google Authenticator, 1Password, or Authy.
            {status?.required ? " Your organization requires 2FA." : ""}
          </p>
        </div>
      </div>

      {message ? <p className="text-sm text-destructive">{message}</p> : null}

      {status?.enabled ? (
        <div className="flex items-center gap-2 text-sm text-emerald-600">
          <CheckCircle2 className="h-4 w-4" />
          Two-factor authentication is enabled on your account.
        </div>
      ) : setup ? (
        <div className="space-y-4 rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">
            Scan the QR code with your authenticator app, then enter the 6-digit code to confirm.
          </p>
          <div className="flex flex-col items-start gap-4 sm:flex-row">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(setup.authUri)}`}
              alt="Authenticator QR code"
              width={180}
              height={180}
              className="rounded-md border border-border bg-white"
            />
            <div className="space-y-2 text-sm">
              <p className="font-medium">Manual entry</p>
              <code className="block break-all rounded bg-muted px-2 py-1 text-xs">{setup.secret}</code>
            </div>
          </div>
          <div className="max-w-xs space-y-1.5">
            <label htmlFor="mfa-setup-code" className="text-sm font-medium">
              Verification code
            </label>
            <input
              id="mfa-setup-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\s/g, ""))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void confirmSetup()}
              disabled={confirming || code.length < 6}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {confirming ? "Confirming…" : "Confirm and enable"}
            </button>
            <button
              type="button"
              onClick={() => setSetup(null)}
              disabled={confirming}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void startSetup()}
          disabled={starting}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {starting ? "Starting…" : "Set up authenticator app"}
        </button>
      )}
    </div>
  );
}
