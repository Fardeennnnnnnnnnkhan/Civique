import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { getAllowedOrigins } from './env';
import { prisma } from '../db';
import { toPublicIncidentSummary } from './publicIncident';
let io: SocketIOServer | null = null;
export function initSocket(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, { cors: { origin: getAllowedOrigins(), methods: ['GET', 'POST'] }, maxHttpBufferSize: 256 * 1024, connectTimeout: 10000 });
  io.use(async (socket, next) => { try { const token = socket.handshake.auth?.token || (socket.handshake.headers.authorization || '').replace(/^Bearer\s+/i, ''); const secret = process.env.JWT_ACCESS_SECRET; if (token && secret) { const decoded = jwt.verify(token, secret) as { id: string }; const user = await prisma.user.findUnique({ where: { id: decoded.id } }); if (user?.active) socket.data.user = user; } next(); } catch { next(); } });
  io.on('connection', (socket) => { socket.join('public'); const user = socket.data.user; if (user) { socket.join(`user:${user.id}`); if (user.cityId) socket.join(`city:${user.cityId}`); if (user.zoneId) socket.join(`zone:${user.zoneId}`); if (user.wardId) socket.join(`ward:${user.wardId}`); if (user.departmentId) socket.join(`department:${user.departmentId}`); } socket.on('join:user', () => { /* server-derived rooms only */ }); });
  return io;
}
export function getIO(): SocketIOServer { if (!io) throw new Error('Socket.io has not been initialized.'); return io; }
export function broadcastIncident(event: 'incident:created' | 'incident:updated', incident: any) { if (io) io.to('public').emit(event, { version: 1, eventId: `${event}:${incident.id}:${Date.now()}`, entityId: incident.id, type: event, timestamp: new Date().toISOString(), payload: toPublicIncidentSummary(incident) }); }
