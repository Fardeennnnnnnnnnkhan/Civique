# M10 — Field Worker Operations

The field-worker workspace is available at `/admin/worker` for authenticated `FIELD_WORKER` accounts. It loads only the worker's assigned work orders, displays operational status/priority/ward/SLA context, allows an assigned worker to start work, and links in-progress work to the resolution-evidence workflow.

## Local checks

```bash
npm run typecheck --workspace=services/api
npm run typecheck --workspace=apps/web
cd services/api && npx ts-node --project tsconfig.json src/services/routing.test.ts
```

The remaining production gate is a disposable-database E2E run proving cross-worker denial, stale assignment rejection, idempotent offline retry, and resolution evidence persistence.
