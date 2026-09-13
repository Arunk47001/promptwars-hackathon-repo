/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Linting is run separately via `npm run lint`.
    ignoreDuringBuilds: false
  }
};

module.exports = nextConfig;
