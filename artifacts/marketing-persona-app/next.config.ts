import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

initOpenNextCloudflareForDev();

const appDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(appDir, "../..");

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  // Keep Node-only deps out of the webpack graph (pg/dns; atproto undici_v* aliases).
  serverExternalPackages: [
    "pg",
    "bcryptjs",
    "@atproto/oauth-client-node",
    "@atproto-labs/fetch-node",
  ],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "images.higgs.ai" },
    ],
  },
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "framer-motion",
      "@radix-ui/react-icons",
      "@workspace/app-shell",
      "@workspace/content-engine",
    ],
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
      "@workspace/serp-provider": "lib/serp-provider/src/index.ts",
      "@workspace/mcp-server": "lib/mcp-server/src/index.ts",
    },
  },
  transpilePackages: [
    "@workspace/app-shell",
    "@workspace/cf-edge",
    "@workspace/db",
    "@workspace/billing",
    "@workspace/integrations-gemini-ai",
    "@workspace/security",
    "@workspace/ai-providers",
    "@workspace/connectors",
    "@workspace/content-engine",
    "@workspace/deepl",
    "@workspace/jobs",
    "@workspace/media",
    "@workspace/mcp-server",
    "@workspace/seo-tools",
    "@workspace/serp-provider",
  ],
  async redirects() {
    return [
      { source: "/agent", destination: "/projects", permanent: true },
      { source: "/autopilot", destination: "/projects", permanent: true },
      { source: "/autopilot/:path*", destination: "/projects", permanent: true },
      { source: "/growth-roadmaps", destination: "/strategy/roadmaps", permanent: true },
      { source: "/content-strategies", destination: "/strategy/calendar", permanent: true },
      { source: "/topical-map", destination: "/strategy/topical-map", permanent: true },
      { source: "/goals", destination: "/strategy/goals", permanent: true },
      { source: "/keyword-tracking", destination: "/search/keywords", permanent: true },
      { source: "/search/suggestions", destination: "/search/keywords?tab=ideas", permanent: true },
      { source: "/ai-visibility", destination: "/search/visibility", permanent: true },
      { source: "/internal-links", destination: "/search/site", permanent: true },
      { source: "/competitor-analysis", destination: "/research/competitors", permanent: true },
      { source: "/reddit-discovery", destination: "/research/reddit", permanent: true },
      { source: "/search/geo-audit", destination: "/audit", permanent: true },
      { source: "/search/geo-audit/:id", destination: "/audit/:id", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
