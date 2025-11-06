/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'duckdb': 'commonjs duckdb',
      });
    }
    return config;
  },
};

module.exports = nextConfig;
