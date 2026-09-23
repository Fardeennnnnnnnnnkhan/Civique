# M21 Predictive Intelligence Runbook

Apply `services/api/prisma/migrations/0029_predictive_intelligence/migration.sql` only to an approved disposable/restored database.

APIs:

```text
GET /api/v1/forecasts/methodology
GET /api/v1/forecasts/hotspots
GET /api/v1/forecasts/runs          # scoped official
GET /api/v1/forecasts/evaluations   # scoped official
POST /api/v1/forecasts/runs         # bounded official run
POST /api/v1/forecasts/:runId/feedback
POST /api/v1/forecasts/runs/:runId/retry
```

The initial `m21-baseline-v1` model is a 28-day count baseline with a maximum 30-day horizon and explicit confidence intervals. Sparse groups below five observations are suppressed, and asset-linked counts are stored as explanatory features. Runs use bounded attempts and leases; retry is limited to failed/retry-wait runs. It is advisory-only and isolated from Incident priority, routing, assignment, lifecycle, and closure commands. Restored-database acceptance must cover retries, held-out evaluation, drift, scope denial, and operator feedback.

Browser route: `/admin/predictions`.

After migration, run the rollback-isolated contract check:

```bash
npm run test:integration:m21 --workspace=services/api
```
