import { strict as assert } from 'assert';
import { Job, JobLeaseLostError, completeJob, extendJobLease, failJob, markExhaustedJobsDead, retryDelaySeconds } from './queue';

type RecordedQuery = { sql: string; values: unknown[] | undefined };

function fakeQueryable(rowCounts: number[]) {
  const calls: RecordedQuery[] = [];
  return {
    calls,
    query: async (sql: string, values?: unknown[]) => {
      calls.push({ sql, values });
      return { rowCount: rowCounts.shift() ?? 0, rows: [] } as never;
    },
  };
}

async function run() {
  assert.equal(retryDelaySeconds(1), 1);
  assert.equal(retryDelaySeconds(2), 2);
  assert.equal(retryDelaySeconds(10), 300);
  assert.throws(() => retryDelaySeconds(0), /positive integer/);

  const owner = fakeQueryable([1, 1]);
  await extendJobLease(owner as never, 'job-1', 'worker-a');
  await completeJob(owner as never, 'job-1', 'worker-a');
  assert.deepEqual(owner.calls[0].values, ['job-1', 'worker-a']);
  assert.match(owner.calls[1].sql, /locked_by=\$2/);

  const lost = fakeQueryable([0]);
  await assert.rejects(() => completeJob(lost as never, 'job-1', 'worker-old'), JobLeaseLostError);

  const retry = fakeQueryable([1]);
  const retryJob: Job = { id: 'job-2', type: 'TEST', payload: {}, attempts: 2, max_attempts: 3, locked_by: 'worker-a' };
  await failJob(retry as never, retryJob, new Error('temporary\nprovider failure'), 'worker-a');
  assert.deepEqual(retry.calls[0].values?.slice(0, 4), ['job-2', 'worker-a', 'RETRY_WAIT', 2]);
  assert.equal(String(retry.calls[0].values?.[4]).includes('\n'), false);

  const terminal = fakeQueryable([1]);
  await failJob(terminal as never, { ...retryJob, attempts: 3 }, new Error('terminal'), 'worker-a');
  assert.deepEqual(terminal.calls[0].values?.slice(0, 4), ['job-2', 'worker-a', 'DEAD_LETTER', 0]);

  const exhausted = fakeQueryable([4]);
  assert.equal(await markExhaustedJobsDead(exhausted as never, 60_000), 4);
  assert.match(exhausted.calls[0].sql, /attempts >= max_attempts/);
  assert.deepEqual(exhausted.calls[0].values, [60_000]);

  console.log('worker queue lease tests passed');
}

void run();
