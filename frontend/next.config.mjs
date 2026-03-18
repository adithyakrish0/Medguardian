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
        return [
            {
                source: '/api/v1/:path*',
                destination: 'http://127.0.0.1:5000/api/v1/:path*',
            },
            {
                source: '/socket.io',
                destination: 'http://127.0.0.1:5000/socket.io/',
            },
            {
                source: '/socket.io/:path*',
                destination: 'http://127.0.0.1:5000/socket.io/:path*',
            },
            {
                source: '/auth/:path*',
                destination: 'http://127.0.0.1:5000/auth/:path*',
            },
            {
                source: '/telegram/:path*',
                destination: 'http://127.0.0.1:5000/telegram/:path*',
            },
            {
                source: '/emergency/:path*',
                destination: 'http://127.0.0.1:5000/emergency/:path*',
            },
            {
                source: '/caregiver/:path*',
                destination: 'http://127.0.0.1:5000/caregiver/:path*',
            },
            {
                source: '/medication/:path*',
                destination: 'http://127.0.0.1:5000/medication/:path*',
            },
            {
                source: '/analytics/:path*',
                destination: 'http://127.0.0.1:5000/analytics/:path*',
            },
            {
                source: '/export/:path*',
                destination: 'http://127.0.0.1:5000/export/:path*',
            },
        ];
    },
};

export default nextConfig;
