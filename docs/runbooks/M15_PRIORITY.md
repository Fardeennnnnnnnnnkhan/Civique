# M15 Priority Engine Runbook

## Local verification

```bash
npm run typecheck --workspace=services/api
npm run typecheck --workspace=apps/web
cd services/api && npx ts-node --project tsconfig.json src/services/priorityEngine.test.ts
```

Apply `services/api/prisma/migrations/0023_priority_engine/migration.sql` only to an approved disposable/development database before testing the APIs.

## API/UI flow

1. Open `/admin/priority` as an authorized municipal operator.
2. Enter an Incident UUID and inspect the deterministic score and signal explanations.
3. Apply a temporary LOW/MEDIUM/HIGH/CRITICAL override with an audit reason and optional expiry up to 90 days.
4. Confirm the override is reflected in the explanation response and visible as active.
5. Revoke it through `POST /api/v1/incidents/priority-overrides/:overrideId/revoke` with a reason.

## Safety rules

- AI confidence can add only a bounded signal; it cannot independently set CRITICAL priority.
- Likes, comments, and ordinary social popularity never change the score.
- Overrides are temporary, scoped, reasoned, and audited.
