# M17 Verifiable Audit Runbook

## Local checks

```bash
npx prisma generate --schema services/api/prisma/schema.prisma
npm run typecheck --workspace=services/api
npm run typecheck --workspace=apps/web
cd services/api && npx ts-node --project tsconfig.json src/utils/audit.test.ts
```

## Database acceptance

Apply `services/api/prisma/migrations/0025_verifiable_audit/migration.sql` only to an approved disposable/restored database. Then exercise:

```bash
npm run test:integration:m17 --workspace=services/api
```

- concurrent audit appends for one Incident;
- mutation, deletion, insertion, and reorder detection through `/api/v1/incidents/:id/audit/integrity`;
- chain-head anchor mismatch detection after tail truncation;
- scoped denial for another city/ward/department;
- JSON export through `/api/v1/incidents/:id/audit/export`;
- citizen timeline redaction through `/api/v1/reports/:id/timeline`.

The public/citizen timeline remains a safe projection. Forensic audit data is never exposed to citizen or public endpoints.
