import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer"],
  images: {
    domains: ["localhost"],
  },
  webpack: (config) => {
    config.externals = [...(config.externals || []), "puppeteer"];
    return config;
  },
};

export default nextConfig;
