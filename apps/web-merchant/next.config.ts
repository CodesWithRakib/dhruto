import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@dhruto/ui", "@dhruto/contracts"],
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
