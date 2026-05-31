import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/db", "@workspace/integrations-gemini-ai"],
};

export default nextConfig;
