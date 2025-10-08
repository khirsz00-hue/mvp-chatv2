/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ['*'] }
  },
  images: { remotePatterns: [] }
}
export default nextConfig
