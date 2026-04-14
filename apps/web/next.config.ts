import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@drip/db", "@drip/engine"],
  outputFileTracingIncludes: {
    "/**": ["../../packages/db/generated/client/**"],
  },
};

export default nextConfig;
