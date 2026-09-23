import { strict as assert } from 'assert';
import { loadWorkerConfig } from './env';

const base = { DATABASE_URL: 'postgresql://local/test' };
const defaults = loadWorkerConfig(base);
assert.equal(defaults.pollMs, 2_000);
assert.equal(defaults.leaseMs, 60_000);
assert.equal(defaults.leaseHeartbeatMs, 20_000);
assert.equal(defaults.shutdownGraceMs, 30_000);

assert.throws(() => loadWorkerConfig({}), /DATABASE_URL/);
assert.throws(() => loadWorkerConfig({ ...base, WORKER_POLL_INTERVAL_MS: 'not-a-number' }), /WORKER_POLL_INTERVAL_MS/);
assert.throws(() => loadWorkerConfig({ ...base, WORKER_LEASE_MS: '2000' }), /WORKER_LEASE_MS/);
assert.throws(
  () => loadWorkerConfig({ ...base, WORKER_LEASE_MS: '6000', WORKER_LEASE_HEARTBEAT_MS: '6000' }),
  /must be less/,
);

console.log('worker environment tests passed');
