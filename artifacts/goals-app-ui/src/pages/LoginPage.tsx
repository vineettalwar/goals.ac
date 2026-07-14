import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/auth";

type AuthMode = "login" | "signup";

export function LoginPage() {
  const { user, loading, login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const mode: AuthMode = location.pathname.startsWith("/signup") ? "signup" : "login";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";

  useEffect(() => {
    if (!loading && user) navigate(from, { replace: true });
  }, [loading, user, navigate, from]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signup") {
        await signup(name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-(--border) bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-(--forest)">
          {mode === "signup" ? "Create your account" : "Sign in to goals.ac"}
        </h1>
        <p className="text-sm text-(--muted) mt-2 mb-6">
          {mode === "signup"
            ? "Start with email and password — Google sign-in coming soon."
            : "Use the email and password for your goals.ac account."}
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {mode === "signup" ? (
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Name</span>
              <input
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 w-full rounded-lg border border-(--border) px-3"
              />
            </label>
          ) : null}

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-lg border border-(--border) px-3"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Password</span>
            <input
              type="password"
              required
              minLength={mode === "signup" ? 8 : 1}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-lg border border-(--border) px-3"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-(--forest) px-4 text-sm font-medium text-white disabled:opacity-60"
          >
            {submitting
              ? mode === "signup"
                ? "Creating account…"
                : "Signing in…"
              : mode === "signup"
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <p className="text-sm text-(--muted) mt-6 text-center">
          {mode === "signup" ? (
            <>
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-(--forest)">
                Sign in
              </Link>
            </>
          ) : (
            <>
              New here?{" "}
              <Link to="/signup" className="font-medium text-(--forest)">
                Create an account
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
