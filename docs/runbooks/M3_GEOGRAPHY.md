# M3 Geography and Jurisdiction Runbook

M3 manages versioned Indore boundaries without silently overwriting an existing dataset. All database commands must use the restored disposable or explicitly approved environment; never omit connection overrides when `.env` points elsewhere.

## Migration

```bash
DATABASE_URL=postgresql://postgres:postgrespassword@127.0.0.1:5432/civique_test \
DIRECT_URL=postgresql://postgres:postgrespassword@127.0.0.1:5432/civique_test \
npx prisma migrate deploy --schema services/api/prisma/schema.prisma
```

## API contract

- `GET /api/v1/geography/cities?cityId=` returns active city hierarchy and supports bounded city filtering.
- `GET /api/v1/geography/resolve?lat=&lng=` returns ward/zone/city/state or explicit `OUT_OF_SERVICE_AREA`.
- `GET /api/v1/geography/datasets?cityId=` is restricted to scoped officials.
- `POST /api/v1/geography/import` accepts `cityId`, `source`, `version`, optional `effectiveDate`/`checksum`, and a `wards` array. Each ward requires `sourceCode`, `name`, `zoneName`, and Polygon/MultiPolygon `boundary`.

The import endpoint computes SHA-256 over the canonical payload, rejects mismatched supplied checksums, rejects a changed payload for an existing source/version, and safely returns an idempotent result for a repeat import.

## Browser checks

1. Sign in as a city administrator and open `/admin/geography`.
2. Select the pilot city, enter a source/version, paste a small approved fixture, and import it.
3. Repeat the same import and confirm the UI reports that no duplicate boundaries were created.
4. Change one coordinate while keeping the same source/version and confirm the API rejects the version conflict.
5. Sign in as an administrator from another city and confirm the import returns `OUT_OF_SCOPE`.
6. Resolve an in-boundary and out-of-boundary coordinate using the report location flow.

## Automated checks

```bash
npm test --workspace=services/api
npm run typecheck
npm run build:api
npm run build:web
```

The remaining M3 gates are database-backed fixture resolution, tenant-isolation HTTP coverage, accessibility checks, and hosted CI evidence.
