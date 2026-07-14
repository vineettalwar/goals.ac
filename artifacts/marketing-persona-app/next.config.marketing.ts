import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(appDir, "../..");

const nextConfig: NextConfig = {
  output: "export",
  distDir: ".marketing-out",
  trailingSlash: true,
  images: { unoptimized: true },
  env: {
    MARKETING_STATIC: "1",
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "https://api.goals.ac",
  },
  turbopack: {
    root: monorepoRoot,
    resolveAlias: {
      "@workspace/cf-edge": "lib/cf-edge/src/index.ts",
      "@workspace/cf-edge/http-mode": "lib/cf-edge/src/http-mode.ts",
      "@workspace/jobs": "lib/jobs/src/index.ts",
      "@workspace/jobs/boss": "lib/jobs/src/boss.ts",
      "@workspace/jobs/queues": "lib/jobs/src/queues.ts",
      "@workspace/deepl": "lib/deepl/src/index.ts",
      sharp: "./sharp-stub.js",
    },
  },
  transpilePackages: [
    "@workspace/cf-edge",
    "@workspace/db",
    "@workspace/billing",
    "@workspace/security",
    "@workspace/ai-providers",
    "@workspace/connectors",
    "@workspace/content-engine",
    "@workspace/deepl",
    "@workspace/jobs",
    "@workspace/media",
    "@workspace/seo-tools",
    "@workspace/serp-provider",
  ],
};

// Redirects for static export live in artifacts/marketing-pages/public/_redirects

export default nextConfig;
