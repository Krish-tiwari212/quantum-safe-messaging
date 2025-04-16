/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable type checking during builds
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable ESLint during builds
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;