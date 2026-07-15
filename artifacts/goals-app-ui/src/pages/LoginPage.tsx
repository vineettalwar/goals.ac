import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AuthPageShell, AuthView } from "@workspace/app-shell";
import { useAuth } from "@/context/auth";
import { getApiBase } from "@/lib/api";

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const callbackUrl = searchParams.get("callbackUrl");
  const from =
    callbackUrl ??
    (location.state as { from?: string } | null)?.from ??
    "/dashboard";

  useEffect(() => {
    if (!loading && user) navigate(from, { replace: true });
  }, [loading, user, navigate, from]);

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
        googleSignInHref={`${getApiBase()}/api/auth/google?returnUrl=${encodeURIComponent(window.location.origin + "/dashboard")}`}
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
    </AuthPageShell>
  );
}
