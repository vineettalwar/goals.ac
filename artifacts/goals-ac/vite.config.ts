import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

function firstNonEmpty(
  ...candidates: Array<string | undefined>
): string | undefined {
  for (const c of candidates) {
    const t = typeof c === "string" ? c.trim() : "";
    if (t !== "") return t;
  }
  return undefined;
}

function parsePositivePort(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/** Vite dev/preview port: explicit web vars first so `PORT=8080` for the API does not steal the UI port. */
function resolveDevServerPort(
  env: Record<string, string>,
  fallback: number,
): number {
  const raw = firstNonEmpty(
    process.env.VITE_DEV_SERVER_PORT,
    env.VITE_DEV_SERVER_PORT,
    process.env.WEB_DEV_PORT,
    env.WEB_DEV_PORT,
    process.env.PORT,
    env.PORT,
  );
  return parsePositivePort(raw, fallback);
}

/** Proxy `/api` → API origin: full URL, or host + port only. */
function resolveApiProxyTarget(env: Record<string, string>): string {
  const full = firstNonEmpty(
    process.env.VITE_DEV_API_PROXY,
    process.env.API_PROXY_TARGET,
    env.VITE_DEV_API_PROXY,
    env.API_PROXY_TARGET,
  );
  if (full) return full;

  const host = firstNonEmpty(
    process.env.VITE_API_HOST,
    env.VITE_API_HOST,
  ) ?? "127.0.0.1";

  const portRaw = firstNonEmpty(
    process.env.VITE_API_PORT,
    process.env.API_SERVER_PORT,
    env.VITE_API_PORT,
    env.API_SERVER_PORT,
  );
  const apiPort = parsePositivePort(portRaw, 8080);
  return `http://${host}:${apiPort}`;
}

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, "");
  const port = resolveDevServerPort(env, 5173);
  const basePath = process.env.BASE_PATH || "/";
  const apiProxyTarget = resolveApiProxyTarget(env);

  return {
    base: basePath,
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      port,
      strictPort: false,
      host: "0.0.0.0",
      allowedHosts: true,
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
    preview: {
      port,
      strictPort: false,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
