import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/auth";
import { Loader2 } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const error = searchParams.get("error");

    if (error) {
      navigate("/login?error=oauth_failed", { replace: true });
      return;
    }

    let cancelled = false;

    fetch(`${API_BASE}/api/auth/me`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return null;
        try {
          return await res.json();
        } catch {
          return null;
        }
      })
      .then((user) => {
        if (cancelled) return;
        if (!user?.id || !user.email || !user.name) {
          navigate("/login?error=oauth_failed", { replace: true });
          return;
        }
        setAuth("session-cookie", {
          id: Number(user.id),
          email: user.email,
          name: user.name,
          role: user.role ?? "user",
        });
        navigate("/dashboard", { replace: true });
      })
      .catch(() => {
        if (!cancelled) {
          navigate("/login?error=oauth_failed", { replace: true });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams, setAuth]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-mesh-dark">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        <p className="text-sm">Signing you in…</p>
      </div>
    </div>
  );
}
