# M5 Report and Incident Engine Runbook

`POST /api/v1/incidents/:id/transition` requires an authenticated official or assigned field worker and a body such as:

```json
{ "to": "ACKNOWLEDGED", "idempotencyKey": "client-generated-command-id" }
```

The backend validates the lifecycle graph, scope, and worker ownership, then writes the incident update, audit record, lifecycle event, and outbox record in one transaction. Repeating the same idempotency key returns the current incident without applying the command again.

Supported path:

`REPORTED → AI_REVIEW → OPEN → ACKNOWLEDGED → ASSIGNED → IN_PROGRESS → RESOLUTION_SUBMITTED → AI_VERIFICATION → CITIZEN_CONFIRMATION → RESOLVED`

Run local checks:

```bash
npm test --workspace=services/api
npm run typecheck
npm run build:api
```

Database concurrency and authorization checks require the restored migrations and an approved disposable database.

The rollback-isolated integration command is:

```bash
npm run test:integration:m5 --workspace=services/api
```

It creates its fixtures inside one transaction and intentionally rolls the transaction back. Do not point it at a shared production database without explicit operator approval.
