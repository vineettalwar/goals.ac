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
  },
  transpilePackages: ["@workspace/db", "@workspace/integrations-gemini-ai", "@workspace/security", "@workspace/ai-providers", "@workspace/connectors", "@workspace/content-engine", "@workspace/jobs", "@workspace/seo-tools", "@workspace/serp-provider"],
  async redirects() {
    return [
      { source: "/agent", destination: "/autopilot", permanent: true },
      { source: "/growth-roadmaps", destination: "/strategy/roadmaps", permanent: true },
      { source: "/content-strategies", destination: "/strategy/calendar", permanent: true },
      { source: "/topical-map", destination: "/strategy/topical-map", permanent: true },
      { source: "/goals", destination: "/strategy/goals", permanent: true },
      { source: "/keyword-tracking", destination: "/search/keywords", permanent: true },
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
