/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.feels.fun',
      },
      {
        protocol: 'https',
        hostname: 'cdn.feels.fun',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'https://api.feels.fun'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
