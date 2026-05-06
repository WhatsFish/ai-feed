/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/feed",
  output: "standalone",
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3010"] },
  },
};

module.exports = nextConfig;
