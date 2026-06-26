/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "a.ltrbxd.com",
        protocol: "https",
      },
    ],
  },
}

export default nextConfig
