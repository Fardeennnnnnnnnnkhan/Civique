import { io } from 'socket.io-client';

const getSocketUrl = () => {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
  // Socket.io connects to the base HTTP server, not the `/api/v1` path
  const url = base.replace(/\/api\/v1\/?$/, '');
  return url;
};

export const socket = io(getSocketUrl(), {
  autoConnect: false, // Allow components to explicitly manage connect/disconnect
  withCredentials: true,
});

export type RealtimeIncidentEvent = {
  version?: number;
  eventId?: string;
  entityId?: string;
  type?: 'incident:created' | 'incident:updated' | string;
  timestamp?: string;
  sequence?: string;
  payload?: { id: string; [key: string]: unknown };
};

export type RealtimeBackfill = {
  events: RealtimeIncidentEvent[];
  latestSequence: string;
  hasMore: boolean;
};

export async function resumeRealtime(afterSequence: string, signal?: AbortSignal) {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
  const response = await fetch(`${base}/incidents/public/events?afterSequence=${encodeURIComponent(afterSequence)}&limit=250`, { credentials: 'include', signal });
  const body = await response.json().catch(() => null) as ({ success?: boolean } & Partial<RealtimeBackfill>) | null;
  if (!response.ok || !body?.success || !Array.isArray(body.events) || typeof body.latestSequence !== 'string') throw new Error('Realtime backfill failed');
  return body as RealtimeBackfill;
}
