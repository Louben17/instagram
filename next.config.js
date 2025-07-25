/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'scontent.cdninstagram.com',
      'scontent-prg1-1.cdninstagram.com',
      'instagram.com',
      'www.instagram.com'
    ],
  },
  async headers() {
    return [
      {
        source: '/embed/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig