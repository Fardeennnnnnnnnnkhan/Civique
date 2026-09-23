# M14 Duplicate Intelligence Runbook

## Local verification

```bash
npm run typecheck --workspace=services/api
npm run typecheck --workspace=apps/web
cd services/api && npx ts-node --project tsconfig.json src/services/duplicateIntelligence.test.ts
```

## Database preparation

Apply `services/api/prisma/migrations/0022_duplicate_intelligence/migration.sql` only to an approved disposable or development database. Do not apply it to the restored shared database without migration review and backup.

## API flow

1. An authorized municipal operator calls `GET /api/v1/reports/duplicate-candidates/:reportId`.
2. Civique returns candidate incidents, distance, score band, and explainable signals.
3. The operator calls `POST /api/v1/reports/duplicate-candidates/:candidateId/decision` with `LINK` or `NOT_DUPLICATE` and an audit reason.
4. `LINK` moves only the Report association to the existing Incident while retaining the Report and decision history.
5. Citizens receive `403`; operational scope is enforced by the backend.
6. An authorized operator can reverse a prior link with `POST /api/v1/reports/duplicate-decisions/:decisionId/unlink`; the source/target incident IDs and audit reason are retained.

## Acceptance still required

- Disposable-database concurrent candidate generation and decision tests.
- Cross-scope denial and repeated-decision tests.
- Report-count consistency and reversible unlink/merge operational workflow.
- Visual-embedding provider canary and labelled positive/negative evaluation before enabling automatic visual links.
