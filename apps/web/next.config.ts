import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@drip/db", "@drip/engine"],
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    if (isServer) {
      // Output WASM files next to the server bundle where they can be found at runtime
      config.output = {
        ...config.output,
        webassemblyModuleFilename: "./../static/wasm/[modulehash].wasm",
      };
    }

    return config;
  },
};

export default nextConfig;
