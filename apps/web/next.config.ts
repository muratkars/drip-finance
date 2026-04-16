import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@drip/engine"],
  serverExternalPackages: ["@prisma/client", "@drip/db"],
};

export default nextConfig;
