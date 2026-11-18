/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  // Never emit source maps in production builds (#808).
  productionBrowserSourceMaps: false,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.externals = [...(config.externals || []), 'sodium-native'];
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'sodium-native': false,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
