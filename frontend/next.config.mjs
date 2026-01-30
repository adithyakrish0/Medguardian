/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        return [
            {
                source: '/api/v1/:path*',
                destination: 'http://127.0.0.1:5001/api/v1/:path*',
            },
            {
                source: '/socket.io/:path*',
                destination: 'http://127.0.0.1:5001/socket.io/:path*',
            },
        ];
    },
};

export default nextConfig;
