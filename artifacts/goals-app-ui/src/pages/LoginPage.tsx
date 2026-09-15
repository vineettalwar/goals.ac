import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AuthPageShell, AuthView } from "@workspace/app-shell";
import { useAuth } from "@/context/auth";
import { getApiBase } from "@/lib/api";

const CONTACT_EMAIL = "contact@goals.ac";
const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}`;

function oauthErrorMessage(code: string | null): string | null {
  if (code === "no_account") {
    return "No account for that Google email. Ask for an invite first.";
  }
  if (code === "oauth_failed") {
    return "Google sign-in failed. Please try again.";
  }
  return null;
}

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() =>
    oauthErrorMessage(searchParams.get("error")),
  );
  const [submitting, setSubmitting] = useState(false);
  const [googleConfigured, setGoogleConfigured] = useState(false);

  const callbackUrl = searchParams.get("callbackUrl");
  const from =
    callbackUrl ??
    (location.state as { from?: string } | null)?.from ??
    "/dashboard";

  const googleSignInHref = useMemo(() => {
    const returnPath = from.startsWith("/") ? from : `/${from}`;
    const returnUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}${returnPath}`
        : returnPath;
    const base = getApiBase();
    const qs = new URLSearchParams({ returnUrl });
    return `${base}/api/auth/google?${qs}`;
  }, [from]);

  useEffect(() => {
    if (!loading && user) navigate(from, { replace: true });
  }, [loading, user, navigate, from]);

  useEffect(() => {
    const base = getApiBase();
    let cancelled = false;
    fetch(`${base}/api/auth/google?probe=1`, { credentials: "omit" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { configured?: boolean } | null) => {
        if (!cancelled) setGoogleConfigured(Boolean(body?.configured));
      })
      .catch(() => {
        if (!cancelled) setGoogleConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthPageShell>
      <AuthView
        mode="login"
        name=""
        email={email}
        password={password}
        onNameChange={() => {}}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        error={error}
        submitting={submitting}
        onSubmit={onSubmit}
        forgotPasswordHref="/forgot-password"
        googleSignInHref={googleConfigured ? googleSignInHref : undefined}
        googleSignInDisabled={!googleConfigured}
        showModeSwitch={false}
        renderLink={({ href, className, children }) => (
          <Link to={href} className={className}>
            {children}
          </Link>
        )}
        renderForgotPasswordLink={({ href, className, children }) => (
          <Link to={href} className={className}>
            {children}
          </Link>
        )}
      />
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Private beta — not launched yet.{" "}
        <a href={CONTACT_MAILTO} className="font-medium text-foreground hover:underline">
          Email {CONTACT_EMAIL}
        </a>{" "}
        for access.
      </p>
    </AuthPageShell>
  );
}
