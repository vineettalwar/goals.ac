import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, "");
  const apiTarget =
    env.VITE_DEV_API_PROXY?.trim() ||
    process.env.VITE_DEV_API_PROXY?.trim() ||
    "http://127.0.0.1:8787";

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": path.resolve(import.meta.dirname, "src") },
      dedupe: ["react", "react-dom"],
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
    server: {
      port: Number(env.VITE_DEV_SERVER_PORT ?? 5174),
      host: "0.0.0.0",
      proxy: {
        "/api": { target: apiTarget, changeOrigin: true },
      },
    },
  };
});
