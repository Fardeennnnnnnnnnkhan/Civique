# M25 Multi-City Control Plane

Apply `services/api/prisma/migrations/0033_multi_city_control_plane/migration.sql` only to an approved disposable/restored database.

Migration `0033` backfills tenant settings for every existing city and provisioning seeds safe defaults: reporting and public map enabled, Socio and predictions disabled. Super administrators provision, update, activate, or deactivate tenant settings through `/api/v1/tenants`; city administrators may only inspect their assigned city. Every feature flag and policy is city-keyed. Public clients use `/api/v1/tenants/public/:slug`, which returns only branding, locale, timezone, residency label, and allow-listed public flags.

Tenant-sensitive queries must continue to enforce city scope in the backend. UI selection is not authorization. Cross-city access is reserved for `SUPER_ADMIN`; do not expose a cross-city operational role to ordinary city administrators.

The first pilot remains Indore. Provisioning another city requires geography import, category/routing policy review, data-residency confirmation, notification/provider review, and cross-city isolation tests before enabling public features.
