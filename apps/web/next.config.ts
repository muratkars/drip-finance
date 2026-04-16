import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@drip/db", "@drip/engine"],
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    if (isServer) {
      // Place WASM files in the server chunks directory where the Lambda can find them
      config.output = {
        ...config.output,
        webassemblyModuleFilename: "chunks/[modulehash].wasm",
      };
    }

    return config;
  },
};

export default nextConfig;
