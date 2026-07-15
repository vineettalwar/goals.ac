import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AuthPageShell } from "@workspace/app-shell";
import { apiFetch } from "@/lib/api";

const INPUT_CLASS =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = await apiFetch<{ ok: true; devResetUrl?: string }>("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (result?.devResetUrl) {
        setDevResetUrl(result.devResetUrl);
      }
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthPageShell>
      <div className="paper-card p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Reset password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your email and we&apos;ll send reset instructions
          </p>
        </div>

        {sent ? (
          <div className="space-y-4 text-center">
            <p className="font-medium">Check your email</p>
            <p className="text-sm text-muted-foreground">
              If an account exists for {email}, you&apos;ll receive a password reset link shortly.
            </p>
            {devResetUrl ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900">
                <p className="font-medium">Dev mode — no email provider configured</p>
                <a href={devResetUrl} className="mt-2 block break-all text-primary hover:underline">
                  {devResetUrl}
                </a>
              </div>
            ) : null}
            <Link
              to="/login"
              className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted/50"
            >
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="forgot-email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Sending…" : "Send reset link"}
            </button>
            <p className="text-center text-sm text-muted-foreground">
              <Link to="/login" className="font-medium text-foreground hover:underline">
                Back to login
              </Link>
            </p>
          </form>
        )}
      </div>
    </AuthPageShell>
  );
}
