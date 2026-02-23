import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    serverExternalPackages: ['@vercel/sandbox'],
    webpack: (config, { isServer, webpack }) => {
        if (!isServer) {
            // just-bash browser bundle has dynamic require("node:zlib") etc.
            // Use NormalModuleReplacementPlugin to intercept node: protocol imports.
            const path = require('path');
            const emptyModule = path.resolve(__dirname, 'src/lib/empty-module.js');

            config.plugins.push(
                new webpack.NormalModuleReplacementPlugin(/^node:/, (resource: any) => {
                    resource.request = emptyModule;
                })
            );

            // Also set fallbacks for non-prefixed versions
            config.resolve.fallback = {
                ...config.resolve.fallback,
                zlib: false,
                buffer: false,
                stream: false,
                util: false,
                path: false,
                fs: false,
                os: false,
                crypto: false,
                child_process: false,
                worker_threads: false,
                async_hooks: false,
                module: false,
                events: false,
                net: false,
                tls: false,
                http: false,
                https: false
            };
        }
        return config;
    },
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'Content-Security-Policy',
                        value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: https:; font-src 'self' https:; frame-ancestors *;"
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
