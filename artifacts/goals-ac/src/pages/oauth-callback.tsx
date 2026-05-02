import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/auth";
import { Loader2 } from "lucide-react";

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    const id = searchParams.get("id");
    const email = searchParams.get("email");
    const name = searchParams.get("name");
    const role = searchParams.get("role") ?? "user";
    const error = searchParams.get("error");

    if (error || !token || !id || !email || !name) {
      navigate("/login?error=oauth_failed", { replace: true });
      return;
    }

    setAuth(token, { id: Number(id), email, name, role });
    navigate("/dashboard", { replace: true });
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-mesh-dark">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        <p className="text-sm">Signing you in…</p>
      </div>
    </div>
  );
}
