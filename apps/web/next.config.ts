import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["@drip/db", "@drip/engine"],
  outputFileTracingIncludes: {
    "/api/**": [
      path.join(__dirname, "../../node_modules/.prisma/client/**"),
      path.join(__dirname, "../../node_modules/@prisma/client/**"),
    ],
    "/dashboard/**": [
      path.join(__dirname, "../../node_modules/.prisma/client/**"),
      path.join(__dirname, "../../node_modules/@prisma/client/**"),
    ],
  },
};

export default nextConfig;
