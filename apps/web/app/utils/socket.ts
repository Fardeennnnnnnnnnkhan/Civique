import { io } from 'socket.io-client';

const getSocketUrl = () => {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
  // Socket.io connects to the base HTTP server, not the `/api/v1` path
  const url = base.replace(/\/api\/v1\/?$/, '');
  return url;
};

export const socket = io(getSocketUrl(), {
  autoConnect: false, // Allow components to explicitly manage connect/disconnect
  auth: () => ({ token: typeof window !== 'undefined' ? localStorage.getItem('accessToken') : undefined }),
});
