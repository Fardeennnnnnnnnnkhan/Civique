import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { prisma } from '../db';
import { broadcastIncident, readRealtimeEvents } from './socket';

async function main() {
  const incidentId = crypto.randomUUID();
  const before = await prisma.$queryRawUnsafe<Array<{ sequence: bigint }>>('SELECT COALESCE(MAX(sequence), 0)::bigint AS sequence FROM realtime_events');
  const start = before[0]?.sequence ?? 0n;

  await broadcastIncident('incident:created', {
    id: incidentId,
    publicTrackingId: 'CIV-REALTIME-TEST',
    category: 'POTHOLE',
    status: 'OPEN',
    priority: 'MEDIUM',
    priorityScore: 0,
    latitude: 22.7196,
    longitude: 75.8577,
    ward: null,
    reportCount: 1,
    createdAt: new Date(),
  });

  const events = await readRealtimeEvents(start, 10);
  const event = events.find((candidate) => candidate.entity_id === incidentId);
  assert.ok(event, 'new incident event must be present in the durable backlog');
  assert.equal(event.event_type, 'incident:created');
  assert.equal(event.payload && typeof event.payload === 'object' ? (event.payload as { trackingId?: string }).trackingId : undefined, 'CIV-REALTIME-TEST');
  assert.ok(event.sequence > start, 'event sequence must be monotonically increasing');

  await prisma.$executeRawUnsafe('DELETE FROM realtime_events WHERE entity_id = $1::uuid', incidentId);
  await prisma.$disconnect();
  console.log('Realtime event persistence/backfill integration test passed.');
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
