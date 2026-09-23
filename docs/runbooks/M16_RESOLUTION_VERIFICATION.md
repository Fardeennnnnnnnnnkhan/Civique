# M16 Resolution Verification Runbook

## Local verification

```bash
npm run typecheck --workspace=services/api
npm run typecheck --workspace=apps/web
cd services/api && npx ts-node --project tsconfig.json src/services/resolutionVerificationPolicy.test.ts
```

Apply `services/api/prisma/migrations/0024_resolution_appeals/migration.sql` only to an approved disposable/development database.

After the restored database has migration `0024_resolution_appeals`, run the transactional acceptance harness:

```bash
npm run test:integration:m16 --workspace=services/api
```

It creates the verification → citizen-confirmation → administrative-close/appeal → reopen path inside a rollback transaction.

## Trust-loop flow

1. A field worker submits after-photo evidence; the incident enters `AI_VERIFICATION`.
2. The worker evaluates deterministic GPS/provenance rules and advisory before/after AI output.
3. An authorized official can call `POST /api/v1/incidents/:id/verification-review` with `APPROVE` or `REJECT` and a reason.
4. Approval enters `CITIZEN_CONFIRMATION`; rejection reopens the Incident.
5. A citizen confirms or disputes through the existing decision endpoint.
6. After the confirmation window expires, an authorized official may use administrative closure only when evidence is verified.
7. A citizen can appeal a resolved Incident for seven days through `POST /api/v1/incidents/:id/appeal`.

AI never closes an Incident by itself, and citizen non-response never produces an AI-only closure.
