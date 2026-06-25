/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // @stellar/stellar-base optionally depends on sodium-native (a Node.js
      // native addon) for crypto. In the browser build webpack tries to bundle
      // it and fails. Replace it with a no-op so the pure-JS fallback inside
      // stellar-base is used instead.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'sodium-native': false,
      };
    }
    return config;
  },
};

export default nextConfig;
