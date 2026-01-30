import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = () => {
    if (!socket) {
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;

        // If a full Socket URL is provided (production), connect to it directly
        // Otherwise, use the proxy rewrite established in next.config.mjs
        if (socketUrl) {
            socket = io(socketUrl, {
                autoConnect: false,
                transports: ['websocket', 'polling']
            });
        } else {
            // Standard Socket.IO path logic for proxy compatibility
            socket = io({
                autoConnect: false,
                transports: ['polling', 'websocket'], // Start with polling for faster connection over proxies
            });
        }

        socket.on('connect', () => {
            console.log('✅ Connected to MedGuardian Socket Relay');
        });

        socket.on('disconnect', () => {
            console.log('🔌 Disconnected from MedGuardian Socket Relay');
        });

        socket.on('error', (err) => {
            console.error('❌ Socket Error:', err);
        });
    }
    return socket;
};

export const connectSocket = (userId: number) => {
    const s = getSocket();

    // Use a one-time listener for the connect event if we're not currently connected
    // This ensures room join happens as soon as the connection is established
    if (!s.connected) {
        s.once('connect', () => {
            console.log(`📡 [Socket] Re-joining room user_${userId} after (re)connect`);
            s.emit('join', { room: `user_${userId}` });
        });
        s.connect();
    } else {
        // If already connected, join the room immediately
        console.log(`📡 [Socket] Joining room user_${userId} immediately`);
        s.emit('join', { room: `user_${userId}` });
    }

    return s;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
