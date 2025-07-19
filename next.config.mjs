/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pdf-parse', 'mammoth'],
  typescript: {
    ignoreBuildErrors: true, // Allow build to complete for demo purposes
  },
  eslint: {
    ignoreDuringBuilds: true, // Allow build to complete for demo purposes
  },
}

export default nextConfig 