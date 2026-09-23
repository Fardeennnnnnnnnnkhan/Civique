# M19 Civic Health Runbook

Apply `services/api/prisma/migrations/0027_civic_health/migration.sql` only to an approved disposable/restored database.

Public APIs:

```text
GET /api/v1/civic-health/methodology
GET /api/v1/civic-health/wards
GET /api/v1/civic-health/wards/:wardId
GET /api/v1/civic-health/wards/:wardId/history
POST /api/v1/civic-health/preview  # authorized, non-mutating
POST /api/v1/civic-health/policies # city admin/super admin
POST /api/v1/civic-health/policies/:id/activate # city admin/super admin
POST /api/v1/civic-health/snapshots/rebuild # nightly-worker-compatible official command
```

The `m19-v1` formula is versioned and every response includes policy ID, source window, components, confidence, completeness, and explanation. Migration provisions the default policy for existing cities. Scores are suppressed below five eligible incidents. Snapshot rebuilds are idempotent by ward/date/policy. Run database acceptance against a restored database for policy activation, snapshot idempotency, late-event recomputation, tenant denial, and sparse-data behavior.

Browser route: `/civic-health`.

After migration, run the rollback-isolated contract check:

```bash
npm run test:integration:m19 --workspace=services/api
```
