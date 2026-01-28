/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Required for Docker/Cloud Run deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Enable optimization for better LCP
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  env: {
    // Expose private env var to browser (maps JJ_PORTAL_CAPTCHA_KEY -> accessible in client)
    JJ_PORTAL_CAPTCHA_KEY: process.env.JJ_PORTAL_CAPTCHA_KEY,
  },
  // Performance optimizations
  experimental: {
    optimizeCss: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
}

export default nextConfig
