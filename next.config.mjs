/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Required for Docker/Cloud Run deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  env: {
    // Expose private env var to browser (maps JJ_PORTAL_CAPTCHA_KEY -> accessible in client)
    JJ_PORTAL_CAPTCHA_KEY: process.env.JJ_PORTAL_CAPTCHA_KEY,
  },
}

export default nextConfig
