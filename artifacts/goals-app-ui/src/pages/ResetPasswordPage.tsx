import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AuthPageShell } from "@workspace/app-shell";
import { apiFetch } from "@/lib/api";

const INPUT_CLASS =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (!token) {
      setError("Invalid reset link");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthPageShell>
      <div className="paper-card p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Choose new password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter a new password for your account
          </p>
        </div>

        {!token ? (
          <div className="space-y-4 text-center">
            <p className="font-medium text-destructive">Invalid reset link</p>
            <p className="text-sm text-muted-foreground">
              This link is invalid or has expired.
            </p>
            <Link
              to="/forgot-password"
              className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted/50"
            >
              Request new link
            </Link>
          </div>
        ) : done ? (
          <div className="space-y-4 text-center">
            <p className="font-medium">Password updated</p>
            <p className="text-sm text-muted-foreground">
              Your password has been reset successfully.
            </p>
            <Link
              to="/login"
              className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <label htmlFor="reset-password" className="text-sm font-medium">
                New password
              </label>
              <input
                id="reset-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={INPUT_CLASS}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reset-confirm" className="text-sm font-medium">
                Confirm password
              </label>
              <input
                id="reset-confirm"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Repeat password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className={INPUT_CLASS}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Updating…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </AuthPageShell>
  );
}
