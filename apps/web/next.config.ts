import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@drip/db", "@drip/engine"],
  outputFileTracingIncludes: {
    "/**": ["../../node_modules/.prisma/client/**"],
  },
};

export default nextConfig;
