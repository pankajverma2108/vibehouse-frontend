/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/bookings/:eri/pre-arrival',
        destination: '/bookings/:eri/web-check-in',
        permanent: false,
      },
      {
        source: '/launching-soon',
        destination: '/upcoming',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
