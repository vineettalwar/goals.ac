import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
    ],
  },
  turbopack: {
    root: monorepoRoot,
    // Turbopack resolves workspace packages from lib/* via the app’s
    // node_modules; explicit aliases keep @workspace/jobs reachable when
    // imported from nested packages like @workspace/content-engine.
    resolveAlias: {
      "@workspace/jobs": "lib/jobs/src/index.ts",
      "@workspace/jobs/boss": "lib/jobs/src/boss.ts",
      "@workspace/jobs/queues": "lib/jobs/src/queues.ts",
      "@workspace/deepl": "lib/deepl/src/index.ts",
    },
  },
  transpilePackages: ["@workspace/db", "@workspace/billing", "@workspace/integrations-gemini-ai", "@workspace/security", "@workspace/ai-providers", "@workspace/connectors", "@workspace/content-engine", "@workspace/deepl", "@workspace/jobs", "@workspace/media", "@workspace/seo-tools", "@workspace/serp-provider"],
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
