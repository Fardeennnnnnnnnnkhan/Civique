import { strict as assert } from 'assert';
import { ReadinessSnapshot, evaluateReadiness } from './readiness';

const healthy: ReadinessSnapshot = {
  database: 'CONNECTED',
  dbLatencyMs: 4,
  missingSchema: [],
  storage: 'CONFIGURED',
  ai: 'AVAILABLE',
  worker: 'AVAILABLE',
  queue: 'AVAILABLE',
  queuePending: 0,
  queueDeadLetter: 0,
};

assert.deepEqual(evaluateReadiness(healthy, true), { ready: true, status: 'READY', blockingReasons: [], degradedReasons: [] });

const optionalOutage = evaluateReadiness({ ...healthy, ai: 'UNREACHABLE', worker: 'STALE_OR_NOT_RUNNING' }, true);
assert.equal(optionalOutage.ready, true);
assert.equal(optionalOutage.status, 'DEGRADED');
assert.deepEqual(optionalOutage.degradedReasons, ['WORKER_UNAVAILABLE', 'AI_UNAVAILABLE']);

const missingDatabase = evaluateReadiness({ ...healthy, database: 'ERROR', queue: 'UNAVAILABLE' }, true);
assert.equal(missingDatabase.ready, false);
assert.deepEqual(missingDatabase.blockingReasons, ['DATABASE_UNAVAILABLE', 'QUEUE_SCHEMA_UNAVAILABLE']);

const storageOptional = evaluateReadiness({ ...healthy, storage: 'NOT_CONFIGURED' }, false);
assert.equal(storageOptional.ready, true);

console.log('readiness policy tests passed');
