# Civique Task Status

## Current UI Program

UX0 — Design Foundation and Safety Baseline

## UI Program Status

PLAN COMPLETE — AWAITING UX0 IMPLEMENTATION

## UI Planning Completed

- [x] Audited all current web routes, shared components, dependencies, and hard-coded theme usage
- [x] Captured the exact supplied TweakCN Cloudflare light/dark tokens, typography, radius, and shadows
- [x] Verified the current shadcn existing-project and workspace setup approach
- [x] Defined role-specific navigation for all eight Civique roles and anonymous users
- [x] Defined page-by-page citizen, map, official, and field-worker workflows
- [x] Defined UX0–UX10 migration modules, tests, acceptance gates, and functionality-preservation rules
- [x] Added `docs/UI_IMPLEMENTATION_PLAN.md`

## UX0 Acceptance Checks Remaining

- [ ] Review `/design-system` in light and dark themes at mobile/tablet/desktop widths
- [ ] Resolve pre-existing legacy-page lint errors during their UX migration modules
- [ ] Re-run production build in a local environment where Turbopack can process Leaflet CSS
- [ ] Implement exact Cloudflare theme, shadcn configuration, primitives, preview, and preservation tests

## UI Next

1. Implement UX0 foundation.
2. Review UX0 before beginning UX1.
3. Keep core M7 acceptance work separate from the UI migration.

## Current Module

M13 — Groq Qwen Multimodal Classification

## Status

M13 IMPLEMENTED — ACCEPTANCE TESTING REQUIRED

## M12/M13 Implemented So Far

- [x] Added notification preferences, idempotency keys, and channel delivery-attempt records (migration `0009_notification_delivery`)
- [x] Added preference APIs at `/api/v1/notifications/preferences`; in-app delivery remains the only enabled channel by default
- [x] Added `AiAnalysis` provenance records (migration `0010_ai_analysis`)
- [x] Added provider-neutral Groq adapter using `GROQ_MODEL=qwen/qwen3.8-27b`, strict JSON response normalization, timeout, and failure-safe fallback
- [x] Removed the Gemini dependency from the active ML requirements
- [x] Report classification records provider/model/prompt/schema provenance and does not block report persistence

## M12/M13 Acceptance Checks Remaining

- [ ] Apply migrations `0009_notification_delivery` and `0010_ai_analysis` to a reachable development database
- [ ] Run notification recipient/preference/idempotency and retry tests
- [ ] Run mocked Groq success, timeout, 429, refusal, malformed-response, and outage tests
- [ ] Move final classification to a durable post-persistence queue and run a separately approved live Groq canary

## M11 Implemented So Far

- [x] Added versioned `SlaPolicy`, `IncidentSla`, and `SlaEscalationEvent` models and migration `0008_durable_sla`
- [x] Added lazy durable SLA state creation with city/global policy selection and timezone metadata
- [x] Added idempotent tier evaluation (department head, zonal officer, commissioner) using unique incident/tier events
- [x] Added durable evaluator worker loop and manual `POST /api/v1/sla/evaluate`
- [x] Added scoped policy listing and incident SLA/breach history endpoints
- [x] Escalation remains auditable and only tier 3 transitions an incident to `ESCALATED`

## M11 Acceptance Checks Remaining

- [ ] Apply migration `0008_durable_sla` to a reachable development database
- [ ] Run timezone/DST, working-calendar, pause/resume, reassignment, and multi-worker idempotency tests
- [ ] Add explicit holiday/calendar elapsed-time calculation and durable queue-backed scheduling

## M10 Implemented So Far

- [x] Added `WorkOrder`, `AssignmentHistory`, and `ResolutionSubmission` models and migration `0007_field_worker_operations`
- [x] Assignment creates/refreshes one active work order and records assignment history
- [x] Worker queue endpoint added at `GET /api/v1/incidents/work-orders`
- [x] Start-work requires the active assigned work order and advances only to `IN_PROGRESS`
- [x] Resolution requires active worker ownership, notes, validated image bytes, capture timestamp, GPS range/tolerance, and unique evidence hash
- [x] Resolution persists immutable evidence provenance and advances only to `RESOLUTION_SUBMITTED`

## M10 Acceptance Checks Remaining

- [ ] Apply migration `0007_field_worker_operations` to a reachable development database
- [ ] Run wrong-worker, stale-assignment, wrong-state, duplicate-evidence, GPS, and timestamp tests
- [ ] Add offline draft sync E2E coverage and production private-object signed delivery

## M9 Implemented So Far

- [x] Added normalized Category, RoutingRule, and RoutingDecision schema and migration `0006_department_routing`
- [x] Added deterministic routing precedence (ward, city, global, priority, effective dates, stable ID tie-break)
- [x] Added scoped routing preview and rule-management APIs under `/api/v1/routing`
- [x] New reports record an explainable routing decision; manual reassignment records a decision
- [x] Assignment rejects inactive/out-of-city/out-of-ward/out-of-department field workers and cross-city departments
- [x] Seeded Indore categories and routing rules idempotently

## M9 Acceptance Checks Remaining

- [ ] Apply migration `0006_department_routing` to a reachable development database
- [ ] Run routing matrix tests for all active categories, fallback, overlap, and effective dates
- [ ] Verify cross-city/ward/department assignment denial with role-scoped E2E tests
- [ ] Verify rule activation/rollback workflow with production-like data

## M8 Implemented So Far

- [x] Added fail-closed role scope helpers for incidents and people
- [x] Added authenticated, paginated `/api/v1/incidents/admin-queue` with server-side status/category/search filters
- [x] Added scope metadata to admin metrics and queue responses
- [x] Admin dashboard now reads the operational queue DTO instead of the public map endpoint
- [x] Replaced mock People Directory data with a scoped paginated API-backed directory
- [x] Removed fabricated analytics rankings and marked M18 analytics honestly unavailable
- [x] Disabled non-persisted settings controls with an explicit read-only explanation
- [x] API and web TypeScript checks pass

## M8 Acceptance Checks Remaining

- [ ] Run role-specific E2E tests against a reachable database
- [ ] Verify cross-city/zone/ward/department denial for queue and directory endpoints
- [ ] Verify pagination/filter behavior with production-like records
- [ ] Implement invitations, activation/suspension, role administration, and persisted settings in authorized follow-up work

## M7 Implemented So Far

- [x] Authenticated Socket.IO handshake loads active database user
- [x] Server-derived personal/city/zone/ward/department rooms; client room impersonation ignored
- [x] Public incident broadcasts use versioned redacted event envelopes
- [x] Notification delivery uses authenticated `user:<id>` rooms
- [x] Socket origins, payload size, and connection timeout are restricted

## M6 Implemented So Far

- [x] Added allow-listed public incident summary DTOs with reduced coordinate precision
- [x] Public incident lists filter `isPublic` and approved lifecycle states
- [x] Removed nested reports, citizen identity, contact data, and media URLs from map list responses
- [x] Added bounded bbox validation and capped pagination (`limit` max 100)

## M5 Implemented So Far

- [x] Central incident transition service with explicit lifecycle graph and actor checks
- [x] `/incidents/:id/status` now uses the transition service; legacy arbitrary handler is isolated
- [x] Atomic audit-log and transactional outbox event for each accepted transition
- [x] Report idempotency key support and explicit duplicate-incident selection validation

## M4 Implemented So Far

- [x] Added `MediaAsset` metadata and migration with SHA-256, MIME, size, privacy, and retention fields
- [x] Added magic-byte validation for JPEG, PNG, and WebP before ML or storage
- [x] Added cryptographically random object keys and private storage paths
- [x] Added idempotent cleanup when database/geography processing fails after upload
- [x] Stopped claiming arbitrary uploads are `CAMERA_LIVE`; capture source is persisted honestly

## M3 Implemented So Far

- [x] Added versioned/checksummed `GeographyDataset` metadata and M3 migration
- [x] Added strict GeoJSON FeatureCollection, coordinate, ring-closure, geometry, and duplicate identity validation
- [x] Replaced destructive geography seed deletes with validated idempotent upserts
- [x] Added explicit `OUT_OF_SERVICE_AREA` response and coordinate range validation
- [x] Added polygon-hole support and geofence cache invalidation

## M2 Implemented So Far

- [x] Public registration ignores client-provided roles and always creates `CITIZEN`
- [x] Removed JWT fallback secrets
- [x] Persisted hashed refresh sessions with rotation, expiry, revocation, and logout-all
- [x] Added `/auth/me` and `/auth/sessions`
- [x] Added authentication rate limiting and HttpOnly refresh cookie
- [x] Added HttpOnly access cookie + CSRF double-submit protection (Bearer compatibility retained)
- [x] Added centralized eight-role permission matrix

## Completed M1 Deliverables

- [x] Non-destructive Prisma migration baseline with job/outbox tables and indexes
- [x] `/health` liveness and `/ready` dependency readiness endpoints
- [x] Environment validation, CORS allow-list, and request body limits
- [x] PostgreSQL worker with transactional claiming, leases, retries, backoff, and dead-letter state
- [x] Root build script corrections and local Postgres healthcheck

## Completed M0 Deliverables

- [x] Audited `Implementation.md`, project documentation, source code, schema, UI, ML service, tests, and git state.
- [x] Distinguished prototype implementation from verified module completion.
- [x] Created the correction-first master plan in `docs/IMPLEMENTATION_PLAN.md`.
- [x] Selected Groq `qwen/qwen3.8-27b` instead of Gemini for planned multimodal analysis.
- [x] Updated the master specification and project memory to reference the new plan.
- [x] Recorded the Groq provider decision.
- [x] Added the current status registry to `Implementation.md`.
- [x] Marked historical Gemini and prototype completion notes as superseded or contextual.
- [x] Defined the correction-first execution order and module Definition of Done.

## Existing Prototype Status

- M1–M13: meaningful code exists, but every module requires correction and formal acceptance under the new Definition of Done.
- M14: distance-only duplicate helper exists; the visual embedding pipeline is not implemented.
- M15: not implemented beyond schema fields and citizen-selected severity.
- M16: not implemented beyond after-photo submission.
- M17: partial hash-chain writes exist; verification and complete coverage are missing.
- M18: UI placeholder exists; real analytics are not implemented.
- M19–M21: not implemented.

## Blocked / Environmental Risks

- The configured PostgreSQL/Supabase database was unreachable during the latest audit.

## Next

1. Run M7 room-impersonation and reconnect acceptance tests.
2. Add event backfill/reconciliation endpoint before M7 final acceptance.
3. Begin M8 only after M7 acceptance.
