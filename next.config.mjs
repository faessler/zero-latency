/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Google Doc images are served through the same-origin /api/image proxy
  // (see app/api/image/route.ts), so the Next.js Image Optimizer is not used.
};

export default nextConfig;
