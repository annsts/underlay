import type { NextConfig } from "next";
import path from 'path';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: process.env.BUILD_TARGET === 'vst' ? '' : (process.env.NODE_ENV === 'production' ? '/underlay' : ''),
  assetPrefix: process.env.BUILD_TARGET === 'vst' ? '' : (process.env.NODE_ENV === 'production' ? '/underlay' : ''),
  outputFileTracingRoot: path.join(__dirname),
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  productionBrowserSourceMaps: false,
  experimental: {
    webpackBuildWorker: false,
  },
  // issue with cssnano-simple
  // Disable CSS minification until fixed. JS is still minified.
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization = config.optimization || {};
      config.optimization.minimize = false;
    }
    config.cache = false;
    return config;
  },
};

export default nextConfig;
