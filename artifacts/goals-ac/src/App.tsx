import { useEffect } from "react";

function resolveMarketingUrl(): string {
  const configured = import.meta.env.VITE_MARKETING_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//${hostname}:3001`;
    }
  }

  return "https://app.goals.ac";
}

function redirectToCanonicalApp() {
  const marketingUrl = resolveMarketingUrl();
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  let path = window.location.pathname;
  if (base && base !== "/" && path.startsWith(base)) {
    path = path.slice(base.length) || "/";
  }
  const target = `${marketingUrl}${path}${window.location.search}${window.location.hash}`;
  window.location.replace(target);
}

export default function App() {
  useEffect(() => {
    redirectToCanonicalApp();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        fontFamily: "system-ui, sans-serif",
        color: "#64748b",
        background: "#fafafa",
      }}
    >
      <p>Redirecting to goals.ac…</p>
    </div>
  );
}
