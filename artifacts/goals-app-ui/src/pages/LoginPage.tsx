import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/auth";
import { authLoginUrl } from "@/lib/api";

export function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-[var(--forest)]">Sign in to goals.ac</h1>
        <p className="text-sm text-[var(--muted)] mt-2 mb-6">
          Product UI runs on <strong>app.goals.ac</strong>. Authentication uses your existing
          session cookie from the canonical Next.js app.
        </p>
        <a
          href={authLoginUrl()}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--forest)] px-4 text-sm font-medium text-white"
        >
          Continue to sign in
        </a>
        <p className="text-xs text-[var(--muted)] mt-4">
          Local dev: run <code>pnpm --filter @workspace/marketing-persona-app run dev</code> on
          port 3001, sign in, then return here.
        </p>
      </div>
    </div>
  );
}
