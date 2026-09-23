# M22 Civique Socio Publishing Runbook

Apply `services/api/prisma/migrations/0030_socio_publishing/migration.sql` only to an approved disposable/restored database.

APIs:

```text
GET /api/v1/socio
GET /api/v1/socio/posts/:id
POST /api/v1/socio/preview
POST /api/v1/socio/publish
POST /api/v1/socio/posts/:id/revoke
POST /api/v1/socio/posts/:id/status (scoped officials only)
POST /api/v1/socio/follows
DELETE /api/v1/socio/follows/:scopeType/:scopeKey
POST /api/v1/socio/posts/:id/save
DELETE /api/v1/socio/posts/:id/save
```

Publishing requires authenticated citizen ownership of the Report, a consent version, and a public alias. `/preview` performs the same redaction/generalization without persisting anything. Only redacted text, generalized coordinates, category, status, and public alias are projected. Evidence, contact details, exact coordinates, and the official civic record are never public. Versioned consent rows record publish/revoke actions; scoped officials can add public status updates without exposing internal notes. Revocation removes the Socio projection without deleting the source record.

Production is fail-closed unless `CIVIQUE_SOCIO_ENABLED=true` is explicitly configured. Keep it disabled until moderation ownership and the restored-database/browser gates are signed off.

Run the rollback-isolated contract check after migration:

```bash
npm run test:integration:m22 --workspace=services/api
```

Keep public posting feature-gated until M23 moderation-readiness review passes.

## M23 engagement and moderation

Apply `services/api/prisma/migrations/0031_socio_trust/migration.sql` after M22. Citizen endpoints include `/posts/:id/reactions`, `/posts/:id/corroborations`, `/posts/:id/comments`, `/comments/:id`, `/content-reports`, and `/controls`. Official moderators use `/moderation/cases` and `/moderation/cases/:id/actions`; affected users can submit `/moderation/cases/:id/appeals`.

All interactions require authenticated citizen accounts and public aliases. Comments are capped at 500 characters, one reply level, and five per minute per author. Moderation actions require a reason and preserve the underlying official civic record. Support and comments are engagement only; only explicitly verified, scope-reviewed corroboration may feed a future bounded priority signal. Moderators can review corroborations and appeals from the admin queue; approved appeals restore only the public projection.
