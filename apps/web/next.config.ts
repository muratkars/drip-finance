import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@drip/db", "@drip/engine"],
};

export default nextConfig;
