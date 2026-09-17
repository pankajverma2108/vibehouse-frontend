/** @type {import('next').NextConfig} */
const isStaticExport = process.env.NEXT_OUTPUT_MODE === 'export';

const nextConfig = {
  output: isStaticExport ? 'export' : 'standalone',
  images: {
    unoptimized: isStaticExport,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  ...(isStaticExport
    ? {}
    : {
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
      }),
};

export default nextConfig;
