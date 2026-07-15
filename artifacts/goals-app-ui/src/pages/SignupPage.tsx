import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AuthPageShell, AuthView } from "@workspace/app-shell";
import { useAuth } from "@/context/auth";
import { getApiBase } from "@/lib/api";

export function SignupPage() {
  const { user, loading, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [name, setName] = useState("");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const callbackUrl = searchParams.get("callbackUrl");
  const from =
    callbackUrl ??
    (location.state as { from?: string } | null)?.from ??
    "/onboarding";

  useEffect(() => {
    if (!loading && user) navigate(from, { replace: true });
  }, [loading, user, navigate, from]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signup(name.trim(), email.trim(), password);
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
        mode="signup"
        name={name}
        email={email}
        password={password}
        onNameChange={setName}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        error={error}
        submitting={submitting}
        onSubmit={onSubmit}
        googleSignInHref={`${getApiBase()}/api/auth/google?returnUrl=${encodeURIComponent(window.location.origin + "/onboarding")}`}
        renderLink={({ href, className, children }) => (
          <Link to={href} className={className}>
            {children}
          </Link>
        )}
      />
    </AuthPageShell>
  );
}
