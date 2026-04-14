import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["@drip/db", "@drip/engine"],
  outputFileTracingIncludes: {
    "/**": [
      path.join(__dirname, "../../packages/db/generated/client/**"),
    ],
  },
};

export default nextConfig;
