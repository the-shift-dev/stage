import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'Content-Security-Policy',
                        value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline'; connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:* https://*.convex.cloud wss://*.convex.cloud; img-src 'self' data: https:; font-src 'self' https:; frame-ancestors *;"
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'ALLOWALL'
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff'
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin'
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=()'
                    }
                ]
            }
        ];
    },
    // Enable CORS for iframe embedding
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: '/api/:path*'
            }
        ];
    },
    reactStrictMode: false
};

export default nextConfig;
