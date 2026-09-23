# M18 Public Accountability Runbook

Apply `services/api/prisma/migrations/0026_accountability_metrics/migration.sql` only to an approved disposable/restored database.

After migration, run the database contract check:

```bash
npm run test:integration:m18 --workspace=services/api
```

Public scorecard:

```text
GET /api/v1/incidents/accountability?days=30
GET /api/v1/incidents/accountability?days=30&format=csv
```

The scorecard uses metric policy `m18-v1`, suppresses cohorts smaller than five, bounds windows to 7–365 days, excludes rejected incidents, omits identity and coordinates, and discloses its methodology. Late events are recomputed from authoritative Incident timestamps; daily snapshots are reserved for the durable worker aggregation path.

Browser route: `/accountability`.
