import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { getAllowedOrigins } from './env';
import { prisma } from '../db';
import { toPublicIncidentSummary } from './publicIncident';
import { Client } from 'pg';
let io: SocketIOServer | null = null;

export type RealtimeRoom = 'public' | `user:${string}` | `city:${string}` | `zone:${string}` | `ward:${string}` | `department:${string}` | `incident:${string}`;

export function parseRealtimeCursor(value: unknown, fallback = 0n): bigint {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return fallback;
  try { return BigInt(value); } catch { return fallback; }
}

export function isValidRealtimeRoom(value: unknown): value is RealtimeRoom {
  return typeof value === 'string' && (value === 'public' || /^(user|city|zone|ward|department|incident):[0-9a-f-]{8,}$/i.test(value));
}

async function canJoinRoom(room: RealtimeRoom, user: { id: string; role?: string } | undefined): Promise<boolean> {
  if (room === 'public') return true;
  if (!user) return false;
  if (room === `user:${user.id}`) return true;
  if (/^(city|zone|ward|department):/.test(room)) {
    const [kind, id] = room.split(':');
    const column = `${kind}Id` as 'cityId' | 'zoneId' | 'wardId' | 'departmentId';
    const member = await prisma.user.findFirst({ where: { id: user.id, [column]: id, active: true }, select: { id: true } });
    return Boolean(member);
  }
  if (room.startsWith('incident:')) {
    const incidentId = room.slice('incident:'.length);
    const owned = await prisma.report.findFirst({ where: { incidentId, submitterRef: user.id }, select: { id: true } });
    if (owned) return true;
    return user.role !== 'CITIZEN';
  }
  return false;
}

export function initSocket(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, { cors: { origin: getAllowedOrigins(), methods: ['GET', 'POST'] }, maxHttpBufferSize: 256 * 1024, connectTimeout: 10000 });
  io.use(async (socket, next) => {
    try {
      const cookieToken = (socket.handshake.headers.cookie || '').match(/(?:^|;\s*)civique_access=([^;]+)/)?.[1];
      const token = socket.handshake.auth?.token || (socket.handshake.headers.authorization || '').replace(/^Bearer\s+/i, '') || cookieToken;
      const secret = process.env.JWT_ACCESS_SECRET;
      if (token && secret) {
        const decoded = jwt.verify(token, secret) as { id: string };
        const user = await prisma.user.findUnique({ where: { id: decoded.id } });
        if (user?.active) socket.data.user = user;
      }
      next();
    } catch {
      next();
    }
  });
  io.on('connection', (socket) => {
    socket.join('public');
    const user = socket.data.user;
    if (user) {
      socket.join(`user:${user.id}`);
      if (user.cityId) socket.join(`city:${user.cityId}`);
      if (user.zoneId) socket.join(`zone:${user.zoneId}`);
      if (user.wardId) socket.join(`ward:${user.wardId}`);
      if (user.departmentId) socket.join(`department:${user.departmentId}`);
    }
    socket.on('realtime:resume', async (lastSequence: unknown, callback?: (result: { events: unknown[]; latestSequence: string | null; error?: string }) => void) => {
      try {
        const after = parseRealtimeCursor(lastSequence);
        const rows = await prisma.$queryRawUnsafe<Array<{ sequence: bigint; event_type: string; entity_id: string; payload: unknown; created_at: Date }>>(
          `SELECT sequence, event_type, entity_id, payload, created_at FROM realtime_events WHERE sequence > $1 AND (is_public=true OR audience_user_id=$2::uuid) ORDER BY sequence ASC LIMIT 250`,
          after, user?.id || null,
        );
        callback?.({
          events: rows.map((row) => ({ version: 1, eventId: `${row.event_type}:${row.entity_id}:${row.sequence}`, entityId: row.entity_id, type: row.event_type, timestamp: row.created_at.toISOString(), sequence: row.sequence.toString(), payload: row.payload })),
          latestSequence: rows.length ? rows[rows.length - 1].sequence.toString() : after.toString(),
        });
      } catch { callback?.({ events: [], latestSequence: null, error: 'REALTIME_RESUME_UNAVAILABLE' }); }
    });
    socket.on('realtime:join', async (roomValue: unknown, callback?: (result: { joined: boolean; error?: string }) => void) => {
      if (!isValidRealtimeRoom(roomValue)) return callback?.({ joined: false, error: 'INVALID_ROOM' });
      try {
        const allowed = await canJoinRoom(roomValue, user);
        if (!allowed) return callback?.({ joined: false, error: 'FORBIDDEN_ROOM' });
        await socket.join(roomValue);
        callback?.({ joined: true });
      } catch { callback?.({ joined: false, error: 'ROOM_UNAVAILABLE' }); }
    });
    socket.on('join:user', () => { /* legacy no-op; server-derived rooms only */ });
  });
  const listener = new Client({ connectionString: process.env.DATABASE_URL });
  listener.connect().then(() => listener.query('LISTEN civique_realtime')).catch((error) => console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'api', module: 'realtime', operation: 'listener.connect', status: 'ERROR', errorType: error instanceof Error ? error.name : 'UnknownError' })));
  listener.on('notification', (message) => {
    try {
      const data = JSON.parse(message.payload || '{}');
      if (typeof data.room === 'string' && typeof data.event === 'string') io?.to(data.room).emit(data.event, data.payload);
    } catch { console.warn(JSON.stringify({ timestamp: new Date().toISOString(), service: 'api', module: 'realtime', operation: 'notification.parse', status: 'IGNORED' })); }
  });
  server.on('close', () => void listener.end().catch(() => undefined));
  return io;
}
export function getIO(): SocketIOServer { if (!io) throw new Error('Socket.io has not been initialized.'); return io; }
export async function broadcastIncident(event: 'incident:created' | 'incident:updated', incident: any) {
  try {
    const payload = toPublicIncidentSummary(incident);
    const rows = await prisma.$queryRawUnsafe<Array<{ sequence: bigint; created_at: Date }>>(
      `INSERT INTO realtime_events (event_type, entity_id, payload, is_public) VALUES ($1, $2::uuid, $3::jsonb, true) RETURNING sequence, created_at`,
      event,
      incident.id,
      JSON.stringify(payload),
    );
    const row = rows[0];
    if (io && row) io.to('public').emit(event, { version: 1, eventId: `${event}:${incident.id}:${row.sequence}`, entityId: incident.id, type: event, timestamp: row.created_at.toISOString(), sequence: row.sequence.toString(), payload });
    return row?.sequence ?? null;
  } catch (error) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'api', module: 'realtime', operation: 'incident.persist', status: 'ERROR', errorType: error instanceof Error ? error.name : 'UnknownError' }));
    return null;
  }
}

export async function readRealtimeEvents(afterSequence: bigint, limit = 250) {
  const boundedLimit = Math.min(Math.max(limit, 1), 250);
  return prisma.$queryRawUnsafe<Array<{ sequence: bigint; event_type: string; entity_id: string; payload: unknown; created_at: Date }>>(
    `SELECT sequence, event_type, entity_id, payload, created_at FROM realtime_events WHERE sequence > $1 AND is_public=true ORDER BY sequence ASC LIMIT $2`,
    afterSequence,
    boundedLimit,
  );
}
