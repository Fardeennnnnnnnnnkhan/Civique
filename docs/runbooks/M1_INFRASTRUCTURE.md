# M1 Infrastructure Operations Runbook

This runbook covers local startup, readiness, durable jobs, migrations, backup/restore rehearsal, and common M1 failures. It never authorizes production changes.

## Safety Rules

- Use local, CI, or explicitly approved staging resources only.
- Queue and migration integration tests require a local database whose name ends with `_test`.
- Never run `prisma migrate dev`, `prisma db push`, restore, truncate, or cleanup commands against production.
- Never place secrets in logs, screenshots, documentation, command history, or committed files.
- If a credential appears in a terminal transcript or shared artifact, revoke/rotate it at the provider and replace all local copies.

## Local Startup

1. Copy `.env.example` to `.env` and provide local-only values.
2. Install Node and Python dependencies.
3. Start the complete stack:

   ```bash
   npm run dev
   ```

The command starts PostgreSQL through Docker Compose unless `SKIP_DOCKER=true`, then starts API, web, worker, and ML processes. It forwards termination signals and stops all child processes when one service exits unexpectedly.

For an already-running database, set `SKIP_DOCKER=true`. To start only PostgreSQL, use `npm run dev:infra`.

## Health and Readiness

- API liveness: `GET http://127.0.0.1:5000/health`
- API readiness: `GET http://127.0.0.1:5000/ready`
- Web health: `GET http://127.0.0.1:3000/api/health`
- ML liveness: `GET http://127.0.0.1:8000/health`
- Full stack check: `npm run health:check`

API readiness returns HTTP 503 only for blocking API dependencies such as PostgreSQL, schema compatibility, queue schema, or required storage configuration. AI or worker outages produce `DEGRADED` with HTTP 200 because report persistence must remain available; the full-stack checker still fails when those services are unavailable.

## Migrations

For a disposable local test database:

```bash
createdb civique_test
DATABASE_URL=postgresql://postgres:postgrespassword@127.0.0.1:5432/civique_test DIRECT_URL=postgresql://postgres:postgrespassword@127.0.0.1:5432/civique_test npx prisma migrate deploy --schema services/api/prisma/schema.prisma
```

Required evidence:

- migrate from an empty database;
- migrate from the oldest supported upgrade fixture;
- run `npx prisma migrate status`;
- run unit and database integration tests;
- record the exact migration range and environment without credentials.

Schema changes use expand/migrate/contract. Rollback normally means rolling application code forward or restoring a rehearsed backup into a new database; do not edit applied migration history.

## Durable Job Verification

Run queue unit tests with `npm test --workspace=services/worker`.

Run database lease/retry/restart/dead-letter coverage only against `civique_test`:

```bash
DATABASE_URL=postgresql://postgres:postgrespassword@127.0.0.1:5432/civique_test npm run test:integration:queue --workspace=services/worker
```

A worker may complete or fail a job only while it owns the active lease. Long-running jobs renew their lease. On graceful shutdown the worker stops claiming new jobs and waits for the active job up to `WORKER_SHUTDOWN_GRACE_MS`.

## Backup and Restore Rehearsal

Create a custom-format backup from an approved source:

```bash
pg_dump --format=custom --no-owner --no-acl --file=/tmp/civique-backup.dump "$DATABASE_URL"
```

Restore only into a newly created disposable database:

```bash
createdb civique_restore_test
pg_restore --exit-on-error --no-owner --no-acl --dbname=postgresql://postgres:postgrespassword@127.0.0.1:5432/civique_restore_test /tmp/civique-backup.dump
```

Verify Prisma migration status, row-count checks for critical tables, API readiness, and a representative Report-to-Incident read. Record backup time, restore duration, checks performed, and cleanup owner. Production RPO target is 15 minutes and RTO target is four hours; these remain unverified until a production-like restore drill passes.

## Failure Response

### API is `NOT_READY`

1. Read `blockingReasons` from `/ready`.
2. Verify PostgreSQL connectivity and migration status.
3. Check `missingSchema` before restarting services.
4. If storage is required but unconfigured, restore the approved server-side configuration; never expose the service-role key to the web app.

### Worker is stale

1. Check the `service_heartbeats` age and structured worker logs.
2. Confirm database connectivity and worker environment validation.
3. Inspect queued, retry-wait, running, and dead-letter counts.
4. Start one worker and confirm heartbeat recovery before scaling out.

### Queue backlog or dead letters

1. Identify job type, age, attempts, and safe failure type without copying private payloads.
2. Fix the provider, configuration, handler, or data defect.
3. Requeue only through a reviewed, idempotent repair command; do not update production rows manually.
4. Confirm backlog age falls and no duplicate domain effect appears.

### Lost job lease

A `JOB_LEASE_LOST` event means another worker reclaimed the job or ownership changed. The stale worker must not complete or fail it. Check execution duration, lease/heartbeat values, database latency, and worker pauses before increasing the lease.

## M1 Verification Command

```bash
npm run verify:m1
```

This command intentionally fails if unit tests, typechecks, lint, or builds fail. Database migration, queue integration, readiness-outage, and backup/restore evidence remain separate environment-backed gates.
