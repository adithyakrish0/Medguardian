/** @type {import('next').NextConfig} */
const nextConfig = {
    skipTrailingSlashRedirect: true,
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    async rewrites() {
        if (process.env.NODE_ENV === 'production') return [];

        return [
            {
                source: '/api/v1/:path*',
                destination: 'http://127.0.0.1:5001/api/v1/:path*',
            },
            {
                source: '/socket.io/:path*',
                destination: 'http://127.0.0.1:5001/socket.io/:path*',
            },
            {
                source: '/socket.io',
                destination: 'http://127.0.0.1:5001/socket.io/',
            },
            {
                source: '/analytics/:path*',
                destination: 'http://127.0.0.1:5001/analytics/:path*',
            },
            {
                source: '/analytics',
                destination: 'http://127.0.0.1:5001/analytics/',
            },
            {
                source: '/export/:path*',
                destination: 'http://127.0.0.1:5001/export/:path*',
            },
        ];
    },
};

export default nextConfig;
