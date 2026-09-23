# M20 Civic Asset Registry Runbook

Apply `services/api/prisma/migrations/0028_civic_assets/migration.sql` only to an approved disposable/restored database.

Core APIs:

```text
GET /api/v1/assets
GET /api/v1/assets/:id
POST /api/v1/assets/imports
POST /api/v1/assets/imports/:id/apply
POST /api/v1/assets/imports/:id/rollback
POST /api/v1/incidents/:id/asset-links
POST /api/v1/assets/:id/maintenance-events
GET /api/v1/assets/:id/qr
```

Imports are preview-first, checksum-idempotent, and reject invalid coordinates/identifiers. JSON rows and GeoJSON FeatureCollections are supported. Applying an import upserts only the same city/type/external identifier; unrelated assets are never overwritten. Rollback removes only version-one assets created by that import. Public DTOs redact coordinates for restricted assets. QR payloads use stable `civique://asset/:id` identifiers.

Admin routes: `/admin/assets` and `/admin/assets/:id`.
