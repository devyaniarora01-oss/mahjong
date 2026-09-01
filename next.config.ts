import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack(config, { dev }) {
    // The local teaching UI is edited frequently while the dev server is open.
    // Avoid stale filesystem cache chunks causing client runtime module errors.
    if (dev) config.cache = false;
    return config;
  },
};

export default nextConfig;
