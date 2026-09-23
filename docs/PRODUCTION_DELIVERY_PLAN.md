# Civique Integrated Production Delivery Plan

**Status:** Release-train companion; implementation remains module-gated  
**Prepared:** 2026-09-07; aligned with master specification 2026-09-20  
**Scope:** Stabilize M1–M13, then deliver M14–M25 with the complete role-specific frontend program  
**Product:** Civique  
**Base theme:** Approved TweakCN Cloudflare theme `cmqx9le2j000504l49jgxe1d0` plus accessible Civique lifecycle semantics  
**Authority:** [`../Implementation.md`](../Implementation.md) is the sole master specification. This file records dependency order, releases, and exit gates; [`ACCEPTANCE_MATRIX.md`](ACCEPTANCE_MATRIX.md) records current status.

---

## 1. Outcome

This plan converts the existing Civique prototype into a production-grade civic issue reporting, verification, resolution, and accountability platform. It joins the core module roadmap and UI transformation into one dependency-ordered delivery program.

The completed platform must support this end-to-end outcome:

1. A citizen or anonymous reporter submits safe evidence and an accurate location.
2. The report persists even when AI or another optional dependency is unavailable.
3. Geography, AI classification, duplicate detection, routing, priority, and SLA processing run asynchronously and remain explainable.
4. One or more Reports link to the correct Incident without losing original submissions.
5. Authorized officials triage, acknowledge, route, and assign work only within their scope.
6. The assigned field worker completes the work order and submits validated resolution evidence.
7. Deterministic checks, Groq/Qwen advisory analysis, human review where needed, and citizen confirmation determine the outcome.
8. The Incident becomes `RESOLVED` or `REOPENED` only through the state machine.
9. Notifications, maps, queues, analytics, and real-time clients reconcile from durable state.
10. Every critical action is private where required, observable, idempotent, and auditable.

No module is production-complete until its database, backend, worker, UI, authorization, accessibility, observability, and test acceptance gates pass together.

## 2. Planning Assumptions and Constraints

- The current implementation through M13 is a meaningful prototype, not an accepted production baseline.
- M14 implementation starts only after the M1–M13 foundation acceptance sweep succeeds.
- The documented Cloudflare token set is the current approved design direction. Existing burgundy/cream and `.premium-*` styling remains only as a temporary compatibility layer during route-by-route migration.
- PostgreSQL/Supabase and Prisma remain the system of record.
- Durable PostgreSQL jobs and outbox events remain the initial queue architecture. Redis/BullMQ requires a separate future decision.
- Groq `qwen/qwen3.8-27b` remains advisory. It cannot independently merge, prioritize, assign, or resolve an Incident.
- Private originals remain private. Browser-visible media uses normalized derivatives and short-lived signed URLs.
- `/api/v1` remains the API base. Existing URLs and valid contracts are preserved or versioned through additive changes.
- Public registration always creates `CITIZEN`; privileged identities use invitation or authorized administration.
- No push, deployment, paid provider call, production mutation, or destructive migration is part of this plan without explicit approval.

## 3. Delivery Model

### 3.1 Vertical slices, not isolated layers

Every capability ships as one vertical slice:

```text
Schema and migration
  -> domain policy and transaction
  -> outbox event and worker job
  -> API contract and authorization
  -> role-specific UI and feedback states
  -> real-time/notification reconciliation
  -> unit, integration, E2E, accessibility, and observability proof
```

UI is not postponed until after backend completion. UX0 and UX1 establish the shared system first; each later module then ships with the pages and components required to operate it.

### 3.2 Module gate

Each module follows this gate:

1. Confirm scope and affected modules.
2. Record current behavior and route contracts.
3. Design additive schema changes and rollback/compatibility strategy.
4. Implement domain rules and object-level authorization.
5. Implement durable jobs, events, retry, and idempotency.
6. Implement typed APIs with validation and pagination.
7. Implement responsive, accessible UI states using reusable components.
8. Add unit, integration, contract, E2E, and visual tests.
9. Run migration, lint, strict typecheck, builds, tests, and security checks.
10. Update project context, task status, API documentation, and ADRs.
11. Demonstrate acceptance evidence and wait for approval before the next unrelated module.

### 3.3 Status vocabulary

- `NOT STARTED`: no meaningful production implementation.
- `PARTIAL`: implementation exists, but one or more gates are missing.
- `BLOCKED`: a documented external dependency prevents acceptance.
- `VERIFIED`: all applicable acceptance evidence exists and passes.

## 4. Target Production Architecture

### 4.1 Runtime responsibilities

- **Next.js web:** public site, citizen PWA, field-worker mobile workflow, municipal operations, analytics, and configuration UI.
- **Express API:** authentication, authorization, validation, state transitions, transaction orchestration, query APIs, signed-media authorization, and audit commands.
- **PostgreSQL/Prisma:** source of truth for identity, geography, reports, incidents, jobs, policies, evidence metadata, analytics, and audit.
- **Durable worker:** media processing, AI classification, duplicate detection, priority calculation, SLA scheduling, notification delivery, analytics, health scoring, and forecasting.
- **FastAPI ML boundary:** deterministic image decode/normalization/quality checks, embeddings, and provider-neutral Groq analysis.
- **Private object storage:** original evidence, normalized derivatives, thumbnails, and export artifacts with retention policies.
- **Socket.IO:** low-latency hints only. Clients always reconcile against versioned API state after reconnect or sequence gaps.

### 4.2 Transaction and event pattern

Every critical mutation must write domain state, an audit record, and an outbox event in one database transaction. The outbox publisher creates idempotent jobs. Consumers store a stable idempotency key and may safely retry.

Required event families:

- `report.created`, `report.media_validated`, `report.geography_resolved`
- `ai.classification.requested`, `ai.classification.completed`, `ai.classification.review_required`
- `duplicate.candidates_generated`, `duplicate.decision_recorded`, `incident.link_changed`
- `incident.created`, `incident.transitioned`, `incident.priority_changed`
- `routing.decision_recorded`, `assignment.changed`, `work_order.started`
- `resolution.submitted`, `verification.completed`, `citizen.decision_recorded`
- `sla.warning`, `sla.escalated`, `notification.requested`, `notification.delivered`
- `analytics.aggregate_requested`, `health_score.computed`, `forecast.completed`

Each event carries `eventId`, `schemaVersion`, `occurredAt`, `actor`, `requestId`, `entityId`, `entityVersion`, and a redacted payload appropriate to its consumers.

### 4.3 API conventions

- Validate `params`, `query`, and `body` at the route boundary with shared schemas.
- Return `{ success, data, meta? }` for success and `{ success: false, error: { code, message, fieldErrors?, requestId } }` for errors.
- Cursor pagination is preferred for event/timeline feeds; bounded page pagination is acceptable for administrative tables.
- Use `Idempotency-Key` for externally retryable commands.
- Use ETags or entity versions for high-conflict administrative updates.
- Never return Prisma records directly from public or cross-role endpoints.
- Use explicit DTO mappers for public, citizen-owner, worker, official, and forensic views.

### 4.4 Authorization model

Authorization is evaluated from the active database user and resource state:

- `CITIZEN`: owned Reports, citizen decisions, public Incidents, own sessions/preferences.
- `FIELD_WORKER`: active assigned work orders and permitted evidence/history.
- `WARD_OFFICER`: permitted wards and subordinate workflow actions.
- `DEPARTMENT_HEAD`: department-owned Incidents/workers inside city scope.
- `ZONAL_OFFICER`: permitted zones and contained wards.
- `COMMISSIONER`: city-wide operations and escalations.
- `CITY_ADMIN`: city configuration, users, policies, routing, and geography.
- `SUPER_ADMIN`: explicitly authorized cross-city platform operations.

Every protected query and mutation needs allow, same-scope allow, cross-scope deny, suspended-user deny, and stale-token tests.

### 4.5 Reliability and observability

- `/health` reports process liveness; `/ready` reports required dependency readiness.
- Structured logs include `requestId`, module, operation, safe actor ID, entity ID, duration, outcome, and error type.
- Metrics cover API rate/errors/latency, job queue age, retries/dead letters, socket connections/reconnects, storage failures, AI latency/refusals/rate limits, SLA lag, notification delivery, and data freshness.
- Alert thresholds and runbooks exist for readiness failure, job backlog, dead letters, database saturation, signed URL failure, AI outage, SLA evaluator lag, and analytics staleness.
- Backups, point-in-time recovery, migration restore drills, and evidence-retention jobs must be tested before release.

## 5. Shared Production UI System

### 5.1 Theme and visual language

- Apply the exact approved Cloudflare light/dark base tokens through CSS variables.
- Add semantic tokens for lifecycle, priority, SLA risk, evidence, and AI advisory states; never encode status by color alone.
- Use Inter for interface text and Fira Code selectively for tracking IDs, hashes, coordinates, and event identifiers.
- Use compact radii, one-pixel structural borders, and restrained elevation. Avoid decorative gradients and oversized dashboard shadows.
- Meet WCAG 2.2 AA contrast, visible focus, reduced-motion, and 44-by-44-pixel mobile target requirements.

### 5.2 Component layers

**Primitives in `components/ui`:** Button, IconButton, Input, Textarea, Select, Combobox, Checkbox, RadioGroup, Switch, FormField, Card, Badge, Alert, Dialog, AlertDialog, Sheet, Drawer, Popover, DropdownMenu, Tooltip, Tabs, Accordion, Breadcrumb, Pagination, Table, Skeleton, Spinner, Progress, Toast, and Command.

**Civique domain components in `components/civique` and feature folders:**

- Navigation: `AppShell`, `RoleSidebar`, `MobileNavigation`, `TopBar`, `PageHeader`, `ScopeBadge`.
- State: `StatusBadge`, `PriorityBadge`, `SLAIndicator`, `AIAdvisoryCard`, `DataState`, `FreshnessIndicator`.
- Reporting: `ReportWizard`, `EvidenceUploader`, `EvidencePreview`, `LocationPicker`, `TrackingReference`.
- Incident operations: `IncidentCard`, `IncidentDataTable`, `IncidentSummary`, `IncidentTimeline`, `TransitionAction`, `AssignmentDialog`.
- Trust workflow: `DuplicateComparison`, `CandidateScoreBreakdown`, `PriorityBreakdown`, `VerificationWorkspace`, `CitizenDecisionPanel`, `AuditIntegrityPanel`.
- Maps: `MapShell`, `MapMarker`, `MarkerCluster`, `MapLegend`, `MapListAlternative`, `LayerControl`.
- Analytics: `MetricCard`, `FilterBar`, `AccessibleChart`, `DataTableFallback`, `ExportDialog`.
- Assets and predictions: `AssetSummary`, `AssetHistory`, `AssetImportWizard`, `ForecastLegend`, `ModelProvenance`.

### 5.3 Modal and disclosure policy

- Use a **Dialog** for focused edits such as assignment, routing preview, priority override, notification preferences, and saved filters.
- Use an **AlertDialog** for consequential decisions such as merge, unmerge, reject evidence, reopen, revoke session, suspend user, or activate a policy.
- Use a **Sheet** for desktop filters, linked reports, evidence metadata, audit event details, and map detail.
- Use a **Drawer/bottom sheet** for the same supporting flows on mobile.
- Use full pages for tasks with navigation, comparison, or evidence context: duplicate review, verification review, policy editing, asset import, and analytics investigation.
- Overlays must have labelled title/description, focus trap, Escape behavior, focus restoration, pending state, server error mapping, and dirty-form protection.

### 5.4 Data and interaction rules

- One typed API client normalizes errors, CSRF, refresh, request IDs, idempotency, and cancellation.
- URL parameters own shareable filters/sorts; form state remains local until submitted.
- Socket events invalidate or patch cached data only when entity versions are consecutive. Gaps trigger a refetch.
- Each data surface implements initial loading, empty, error, retry, stale, offline/reconnecting, permission-denied, and success feedback.
- Optimistic UI is limited to reversible low-risk interactions. Civic state transitions wait for server confirmation.

## 6. Foundation Acceptance Sweep: M1–M13

This is the mandatory entry gate for post-M13 implementation. It corrects the existing prototype without expanding into M14.

### 6.1 M1 — Infrastructure

- Apply and verify migrations `0001`–`0010` on a fresh local database and a production-like staging database.
- Prove worker claim, lease recovery, retry, idempotency, and dead-letter behavior.
- Make root lint, typecheck, tests, API/web/worker builds, health, and readiness deterministic.
- Add migration rollback/compatibility notes, backup instructions, and failure runbooks.

### 6.2 M2 — Authentication and scope

- Complete privileged invitation, acceptance, password recovery, session revocation/reuse detection, and suspension.
- Finish web migration from `localStorage` to Secure/HttpOnly cookies and CSRF-safe commands.
- Add the full eight-role and object-scope test matrix.

### 6.3 M3–M6 — Geography, reporting, lifecycle, and public map

- Validate/import the versioned ward dataset and verify holes/boundaries/service-area behavior.
- Normalize uploaded media, generate derivatives, implement short-lived signed delivery, retention, and cleanup.
- Complete citizen confirmation/dispute command ownership required by the lifecycle.
- Remove or strictly authorize the legacy status route.
- Add a private admin incident-detail DTO and verify every public response is redacted.

### 6.4 M7–M10 — Real time and operations

- Add monotonic event sequence/version data and reconnect backfill/reconciliation.
- Prove room isolation and prevent identity or scope impersonation.
- Complete role-scoped admin queue/directory E2E tests and persisted settings/invitation surfaces where APIs exist.
- Apply routing and work-order migrations; test cross-scope denial, reassignment, stale work orders, evidence GPS/time/hash, and offline draft retry.

### 6.5 M11–M13 — SLA, notifications, and AI classification

- Add working calendars, holidays, pause/resume/reassignment rules, and durable scheduling to SLA.
- Prove notification recipient selection, preference suppression, idempotency, retries, and private delivery.
- Move final M13 classification to a durable post-persistence job.
- Add mocked Groq success, timeout, 429, refusal, malformed output, and outage tests; add a labelled evaluation set.
- Remove remaining active Gemini code and run a live Groq canary only with explicit cost/network approval.

### 6.6 Foundation exit criteria

- M1–M13 each have a current status and evidence record.
- Migrations `0001`–`0010` apply cleanly from empty state and against the supported upgrade baseline.
- No critical/high authorization, privacy, upload, state-machine, or secret-management issue remains.
- API/web/worker/ML checks pass; project-owned integration and E2E suites are installed and runnable.
- UX0 and UX1 are accepted so future modules use the shared production UI system.
- The pre-M14 golden flow passes through `RESOLUTION_SUBMITTED`, with downstream verification explicitly pending M16.

## 7. UX0 and UX1 — Frontend Foundation Before M14

### UX0 — Design foundation

- Install/configure shadcn safely in `apps/web`, apply approved tokens, self-host fonts, and retain legacy styles for unmigrated routes.
- Build and document primitives plus status/priority semantics in a development-only `/design-system` route or component harness.
- Capture baseline screenshots and route contracts for every current page.
- Add component behavior, keyboard, accessible-name, theme, and visual tests.

### UX1 — Shell and global feedback

- Deliver role-aware desktop/mobile navigation for all eight roles and anonymous users.
- Add scope context, breadcrumbs, account/session actions, notification entry, global errors, toasts, route loading, and not-found states.
- Move authentication consumption behind one session boundary.
- Preserve all routes, guards, logout, notifications, maps, and responsive behavior.

## 8. M14 — Duplicate Detection and Review

### Objective and dependencies

Create explainable, reversible Report-to-Incident linking. Depends on accepted M3 geography, M4 media derivatives, M5 transactions/state machine, M13 classification provenance, and M17-compatible audit event shape.

### Database

- Add versioned `Embedding`, `DuplicateCandidate`, `DuplicateDecision`, and `IncidentLinkHistory` records.
- Store embedding model/version/dimension, derivative hash, generated time, vector reference, and invalidation state.
- Store component scores, thresholds, reason codes, Qwen review provenance, final decision, reviewer, and timestamps.
- Enforce one active Report-to-Incident link and preserve complete link history.
- Add candidate indexes by city, category, status, capture time, geography, and decision state.

### Backend and worker

- Generate a 1024-dimensional local embedding from the normalized derivative.
- Retrieve candidates using city, category compatibility, active state, time window, and distance before vector comparison.
- Score SHA-256/perceptual hash, cosine similarity, distance, time, category compatibility, and incident activity.
- Use Qwen only inside a configured uncertain band.
- Produce `AUTO_LINK`, `SUGGEST_REVIEW`, or `NEW_INCIDENT` with versioned reason codes.
- Make merge/unmerge transaction-safe, recalculate counts/centroid, and emit audited outbox events.

### API

- `GET /api/v1/duplicate-reviews` — scoped paginated review queue.
- `GET /api/v1/duplicate-reviews/:id` — redacted comparison, component scores, and provenance.
- `POST /api/v1/duplicate-reviews/:id/decide` — approve link, reject link, or create Incident.
- `POST /api/v1/incidents/:id/merge` and `/unmerge` — privileged reversible commands with reason and idempotency.
- Extend citizen Report detail with safe duplicate/link status; do not expose another citizen's identity or private media.

### UI

- Add `/admin/duplicate-review` with a comparison workspace: synchronized before-image zoom, map distance, time/category facts, linked Incident preview, score breakdown, and AI advisory.
- Use `DuplicateComparison`, `CandidateScoreBreakdown`, `EvidenceGallery`, `MapShell`, and `AIAdvisoryCard`.
- Use an AlertDialog for merge/unmerge consequences and a Sheet for full provenance.
- Citizen UI shows “matched to an existing issue” in plain language and links only to an authorized/public Incident view.

### Tests and acceptance

- Labeled positive/negative pairs, dense-location false positives, concurrent submissions, vector-version migration, Qwen outage, and merge/unmerge integrity.
- Measure and approve precision/recall thresholds by category; record dataset and model versions.
- Accept only when links are explainable, reversible, audited, and never erase Reports.

## 9. M15 — Explainable Priority and Urgency

### Objective and dependencies

Calculate reproducible 0–100 priority from deterministic policy inputs with advisory AI signals. Depends on M9 routing, M11 SLA, M13 AI provenance, and M14 report density.

### Database

- Add `PriorityPolicy`, `PriorityAssessment`, and `PriorityOverride`.
- Store component inputs/contributions, policy version, final score/level, source event, evaluation time, and supersession.
- Store override reason, actor, scope, expiry, and revocation.

### Backend and worker

- Version weights for category risk, sensitive location, verified severity, report density, incident age, SLA proximity, and obstruction/hazard signals.
- Reject client-computed priority and untrusted citizen severity as final authority.
- Recalculate idempotently after relevant reports, duplicate links, routing/SLA changes, and approved overrides.
- Preserve prior assessments for deterministic replay.

### API

- `GET /api/v1/incidents/:id/priority` — current breakdown and history according to role.
- `GET /api/v1/priority/policies` and version detail — scoped administration.
- `POST /api/v1/priority/policies` and activation command — city admin/super admin.
- `POST /api/v1/incidents/:id/priority-override` and revoke — authorized officials with reason/expiry.

### UI

- Add `PriorityBadge` everywhere Incidents are scanned and `PriorityBreakdown` on operations detail.
- Add a priority-policy page under city configuration with version comparison and non-mutating preview.
- Use a Dialog for override input and an AlertDialog for activation/revocation.
- Show exact reason codes and policy version; label AI-derived components advisory.

### Tests and acceptance

- Boundary, monotonicity, deterministic replay, policy versioning, manipulation resistance, cross-scope override denial, expiry, and concurrent recalculation.
- Accept when identical inputs/policy reproduce the score and every override is scoped, temporary where configured, reasoned, and audited.

## 10. M16 — Resolution Verification and Citizen Decision

### Objective and dependencies

Complete the trust loop without allowing AI to resolve Incidents. Depends on M4 secure media, M5 state transitions, M10 immutable resolution submission, M12 notifications, M13 AI, and M17-compatible auditing.

### Database

- Add `ResolutionVerification`, `VerificationSignal`, `CitizenDecision`, and hashed `CitizenDecisionToken` records.
- Store deterministic checks, Qwen provenance/output, combined result, reviewer action, policy version, and timestamps.
- Keep before/after evidence immutable and reference exact media hashes.
- Model token expiry, one-time use, revocation, and anonymous ownership without storing raw tokens.

### Backend and worker

- Validate assignment ownership, capture time, GPS distance, media quality, derivative integrity, and before/after relevance.
- Ask Qwen for structured observed change, remaining issue, relevance, ambiguity, and manipulation signals.
- Combine signals into `VERIFIED`, `REVIEW_REQUIRED`, or `REJECTED`; Qwen alone cannot decide.
- Route accepted verification to `CITIZEN_CONFIRMATION`.
- Handle citizen confirm/dispute, timeout policy, official review, rejection back to work, and valid dispute to `REOPENED` plus new work order.

### API

- `GET /api/v1/verifications` and `GET /:id` — scoped review queue/detail.
- `POST /api/v1/verifications/:id/review` — authorized approve/reject/request-evidence command.
- `POST /api/v1/incidents/:id/citizen-confirmation` — authenticated owner.
- `POST /api/v1/public/citizen-decisions/:token` — rate-limited one-time anonymous decision.
- `GET /api/v1/incidents/:id/resolution-summary` — role-safe verification summary.

### UI

- Add `/admin/verifications` and `/admin/verifications/[id]` with side-by-side evidence, zoom, metadata integrity, location comparison, deterministic checks, AI advisory, linked work order, and decision controls.
- Add `VerificationWorkspace`, `EvidenceGallery`, `AIAdvisoryCard`, and `CitizenDecisionPanel`.
- Citizen Report detail gains a clear confirm/dispute panel; anonymous users get a narrowly scoped token page.
- Field-worker UI shows submitted, review-required, rejected with reason, or accepted-awaiting-citizen states.
- Use an AlertDialog for reject/reopen and a Sheet for evidence provenance.

### Tests and acceptance

- Fixed/not-fixed/ambiguous/manipulated/wrong-location/low-quality pairs, AI timeout/refusal, human review, token guessing/reuse/expiry, citizen ownership, timeout, dispute, and reopen E2E.
- Accept when both `RESOLVED` and `REOPENED` golden paths pass and no AI-only transition is possible.

## 11. M17 — Complete Verifiable Audit Trail

### Objective and dependencies

Make critical activity append-only, tamper-evident, complete, and independently verifiable. The final event format should be agreed before M14 writes new trust events; full verification ships here.

### Database and integrity

- Extend `AuditLog` with canonical schema version, entity version, event ID, before/after hashes, previous hash, chain hash, actor context, request ID, and redaction class.
- Serialize appends per entity/Incident to prevent chain forks.
- Add `AuditVerificationRun` and optional signed checkpoints for large-chain verification.
- Enforce append-only database/application permissions for production roles.

### Backend and worker

- Centralize canonical JSON serialization and hash calculation.
- Cover auth/security, Reports, links/duplicates, routing, priority, assignment, lifecycle, SLA, AI, overrides, evidence, verification, citizen decisions, policies, assets, and forecasts.
- Provide full and incremental chain verification, broken-link diagnostics, scoped export, and safe public timeline projection.
- Run scheduled verification and alert on integrity failure without silently repairing history.

### API

- `GET /api/v1/audit/incidents/:id/timeline` — role-safe timeline.
- `GET /api/v1/audit/incidents/:id/integrity` — authorized verification summary.
- `POST /api/v1/audit/verify` — privileged bounded verification job.
- `POST /api/v1/audit/exports` and status/download — scoped forensic export.

### UI

- Incident detail receives a human-readable timeline for citizens/officials and an authorized `AuditIntegrityPanel` for forensic roles.
- Add `/admin/audit` for filters, verification runs, integrity failures, and exports.
- Event detail opens in a Sheet; export uses an `ExportDialog`; suspected tampering uses a high-severity Alert.
- Public timelines show safe civic events only, never internal actor identity or private evidence.

### Tests and acceptance

- Deterministic hashes; modification, deletion, reorder, insertion, and concurrent append detection; coverage assertions for every critical command.
- Accept when valid chains verify, tampering is detected, and no critical workflow step lacks an audit event.

## 12. M18 — Public Accountability and Operational Analytics

### Objective and dependencies

Replace placeholders with privacy-safe, reproducible aggregates. Depends on stable M17 event semantics and completed M16 outcome definitions.

### Database and worker

- Add `MetricDefinition`, `DailyCivicAggregate`, `AnalyticsSnapshot`, and `AnalyticsExport`.
- Version formulas for intake, acknowledgement, assignment, resolution, reopen, SLA breach, verification, and citizen confirmation.
- Compute daily aggregates by city, zone, ward, department, category, and allowed combinations.
- Apply cohort suppression, late-event correction, snapshot freshness, and idempotent rebuilds.

### API

- `GET /api/v1/analytics/overview`, `/trends`, `/comparisons`, and `/definitions`.
- `POST /api/v1/analytics/exports` plus status and short-lived download.
- Public endpoints return suppressed aggregate DTOs; official endpoints enforce scope.
- All responses include formula/snapshot version, timezone, filters, and freshness.

### UI

- Replace `/admin/analytics` placeholders with overview, trends, SLA, workload, resolution quality, and comparison tabs.
- Add `/accountability` as a public scorecard with privacy-safe city/ward/department views.
- Use `MetricCard`, `FilterBar`, `AccessibleChart`, data-table alternatives, definition Sheets, and `ExportDialog`.
- Charts must include titles, units, legends, source/freshness, accessible summaries, and empty/suppressed explanations.

### Tests and acceptance

- Formula fixtures, timezone boundaries, late events, snapshot rebuilds, scope denial, cohort suppression, export authorization, and chart/table parity.
- Accept when every number reproduces from versioned events and no public response exposes personal data.

## 13. M19 — Civic Health Score

### Objective and dependencies

Create a transparent ward health index from accepted M18 aggregates.

### Database and worker

- Add `CivicHealthPolicy`, `CivicHealthSnapshot`, and component detail records.
- Normalize unresolved burden, severity, SLA compliance, recurrence, resolution quality, and citizen confirmation.
- Store weights, source snapshot, confidence/completeness, score, rank eligibility, and history.
- Compute nightly; suppress or widen uncertainty for sparse data.

### API

- `GET /api/v1/civic-health/wards`, `/wards/:id`, `/history`, and `/methodology`.
- `POST /api/v1/civic-health/preview` — authorized non-mutating what-if analysis.
- Policy creation/activation endpoints for city admin/super admin.

### UI

- Add public `/civic-health` with map/list, score components, trend, methodology, uncertainty, and freshness.
- Add official comparison and policy preview under analytics/configuration.
- Use `HealthScoreSummary`, `MapShell`, `AccessibleChart`, `MethodologySheet`, and a policy preview Dialog.
- Never present low-data scores with false precision or unexplained ranking.

### Tests and acceptance

- Reproducibility, normalization boundaries, missing/sparse data, policy changes, nightly idempotency, ranking ties, and accessibility.
- Accept when every score traces to a policy and aggregate snapshot and its changes are explainable.

## 14. M20 — Civic Asset Registry

### Objective and dependencies

Link civic incidents to accountable municipal assets without collapsing asset, Report, and Incident identities. Depends on M3 geography, M9 department ownership, M17 audit, and M18 analytics.

### Database

- Add `AssetType`, `CivicAsset`, `AssetGeometry`, `AssetIncidentLink`, `AssetMaintenanceEvent`, and `AssetImportRun`.
- Store external identifiers, ownership, geometry, condition, lifecycle dates, public/private field policy, source/version, and optimistic entity version.
- Enforce uniqueness within city/source/type and retain import/link history.

### Backend and worker

- Implement validated CSV/GeoJSON import with preview, row errors, checksum, idempotent apply, and compensating rollback.
- Generate spatial candidates for Report/Incident-to-asset links; humans can correct them.
- Add asset maintenance history and condition updates through authorized commands.
- Rebuild asset-linked aggregates asynchronously.

### API

- `GET /api/v1/assets`, `GET /assets/:id`, and scoped map endpoints.
- `POST /api/v1/assets/imports`, preview/apply/rollback, and status endpoints.
- `POST /api/v1/incidents/:id/asset-links`, confirm/correct/unlink commands.
- `POST /api/v1/assets/:id/maintenance-events` and condition update commands.

### UI

- Add `/admin/assets` directory/map, `/admin/assets/[id]` detail/history, and `/admin/assets/import` wizard.
- Incident operations gets an asset summary and link/correct Dialog.
- Public map exposes only allowed asset layers and fields.
- Use `AssetSummary`, `AssetHistory`, `AssetImportWizard`, `MapShell`, validation table, confirmation AlertDialog, and import-result Sheet.

### Tests and acceptance

- Malformed geometry/CSV, duplicate IDs, preview/apply mismatch, partial failure, rollback, cross-city denial, concurrent updates, public-field redaction, and link correction.
- Accept when imports cannot silently overwrite unrelated assets and every asset/link/history change is audited.

## 15. M21 — Predictive Civic Intelligence

### Objective and dependencies

Forecast hotspots responsibly using privacy-safe M18/M20 aggregates. Prediction remains advisory and cannot create, prioritize, assign, or close work.

### Database and worker

- Add `ForecastDataset`, `ForecastRun`, `ForecastCell`, `ModelEvaluation`, and `OperatorForecastFeedback`.
- Version data window, features, geography, algorithm, parameters, horizon, metrics, status, and artifact checksums.
- Establish seasonal/statistical baselines; add Prophet only when held-out backtesting materially improves agreed metrics.
- Schedule training/inference with leases, cancellation, retries, drift checks, and failure isolation.

### API

- `GET /api/v1/forecasts/runs`, `/hotspots`, `/evaluations`, and `/methodology`.
- `POST /api/v1/forecasts/runs` — authorized bounded run.
- `POST /api/v1/forecasts/:id/feedback` — scoped operator feedback.
- Public prediction access is optional and must use coarse, privacy-safe aggregates.

### UI

- Add `/admin/predictions` with horizon/date/category controls, hotspot map, list alternative, confidence intervals, observed-vs-predicted chart, and provenance.
- Use `MapShell`, `ForecastLegend`, `ModelProvenance`, `AccessibleChart`, and feedback Dialog.
- Clearly label predictions, uncertainty, generated date, coverage, and advisory limitations.

### Tests and acceptance

- Time-based train/test splits, leakage prevention, baseline comparison, reproducibility, drift, missing data, failed run isolation, scope/privacy, and accessible map alternative.
- Accept only if the selected model beats the documented held-out baseline and every prediction includes uncertainty/provenance.

## 16. M22 — Civique Socio Publishing and Feed

### Objective and dependencies

Create an explicit-consent, privacy-safe public participation layer that projects approved Report/Incident information without creating a second complaint system. Depends on M4 media privacy, M6 public DTOs, M12 notifications, M17 audit semantics, and M18 public metrics definitions.

### Delivery slice

- Add public aliases, versioned publication consent, Socio posts/media projections, follows, saves, feed cursors, and ranking-version records.
- Publish only reviewed redacted derivatives and generalized location; sensitive or unredactable cases enter moderation or remain ineligible.
- Add `/socio`, `/socio/[postId]`, publication preview, revocation, locality/category/status feeds, and official-status inserts.
- Make revocation remove the public projection without modifying the source Report, Incident, evidence, or audit chain.

### Acceptance

- Consent, revocation, authorization, DTO redaction, feed pagination/ranking, media privacy, and underlying-record preservation tests pass.
- The module remains feature-gated until an independent privacy and moderation-readiness review passes.

## 17. M23 — Engagement, Moderation, and Civic Trust

### Objective and dependencies

Add safe civic interaction without allowing engagement metrics to control municipal priority or SLA. Depends on M22 projections, M15 policy inputs, M17 audit, and account/security controls.

### Delivery slice

- Add one support reaction per user, structured verified corroboration, shallow threaded comments with revision history, follows, blocks/mutes, reports, moderation cases/actions, appeals, and reputation signals.
- Require authenticated citizens and public aliases; exclude anonymous comments, DMs, public contact details, and unrestricted media from v1.
- Version feed ranking across locality, relevance, recency, Incident state, quality, diversity, and safety; detect spam, coordination, repeated content, and brigading for review.
- Allow only verified `AFFECTED` corroboration to become a bounded M15 policy input. Likes and comments remain engagement signals.

### Acceptance

- Abuse, rate-limit, harassment, privacy, moderation, appeal, suspension, ranking fairness, and record-preservation suites pass.

## 18. M24 — Government and Channel Integrations

### Objective and dependencies

Integrate approved government and communication systems through replaceable adapters without coupling core reporting to external availability.

### Delivery slice

- Add signed webhooks, external references, inbox/outbox reconciliation, delivery receipts, retries, replay protection, conflict state, and operator repair tools.
- Implement adapters only after formal approval for IMC/311/e-Nagar Palika/GIS, SMS, WhatsApp, IVR, kiosk, or call-centre channels.
- Keep external failure isolated; synchronization never overwrites authoritative Civique history silently.

### Acceptance

- Signature, replay, ordering, idempotency, outage, conflict, redaction, and reconciliation tests pass before a live adapter is enabled.

## 19. M25 — Multi-City Control Plane

### Objective and dependencies

Expand the Indore-proven platform through explicit tenant provisioning and strict isolation rather than city-specific forks.

### Delivery slice

- Add tenant provisioning, city-specific geography, categories, policies, branding, integrations, model/provider configuration, feature flags, and data-residency metadata.
- Add bounded cross-city administration with reserved permissions and complete audit.
- Partition every database query, socket room, job, storage key, export, aggregate, Socio feed, and integration by tenant scope.

### Acceptance

- Tenant-isolation, provisioning rollback, configuration inheritance, storage/socket/job separation, and cross-city denial suites pass.

## 20. Integrated UI Migration Sequence

The UX0–UX14 program remains valid, with execution paired to capability readiness:

1. **Foundation sweep + UX0/UX1:** theme, primitives, session boundary, shell, navigation, feedback, test harness.
2. **UX2/UX3:** public/auth and citizen reporting while M1–M13 acceptance is completed.
3. **UX4/UX5:** citizen tracking and public map after private DTOs, media signing, and socket reconciliation pass.
4. **UX6/UX7:** municipal queue and incident operations before M14/M15 review and override surfaces.
5. **UX8:** field-worker mobile operations before M16 verification acceptance.
6. **UX9:** notifications, people, sessions, invitations, and real persisted settings after supporting APIs pass.
7. **UX10:** real M18/M19 analytics, accessibility, performance, visual regression, legacy removal, and final golden flow.
8. **M20/M21 UI:** asset and prediction routes join the accepted shell/design system and final regression matrix.
9. **M22/M23 UI:** consent preview, Socio feed/post, public alias, corroboration, comments, moderation, and appeals ship behind independent privacy/moderation gates.
10. **M24/M25 UI:** integrations, external-reference repair, tenant provisioning, and cross-city administration ship only after authority and isolation acceptance.

No route loses its legacy fallback until its functionality contract, visual checks, responsive checks, and E2E tests pass.

## 21. Route and Role Completion Map

- **Anonymous:** `/`, `/signin`, `/signup`, `/map`, `/track`, `/socio`, public post detail, accountability, civic health, help/privacy/accessibility.
- **Citizen:** `/report`, `/report/[id]`, `/profile`, Socio publication/interaction, notifications/preferences, confirmation/dispute/appeal.
- **Field worker:** `/worker`, tasks/detail, work map, history, notifications, profile, offline evidence capture.
- **Ward/department/zonal/commissioner:** `/admin`, Incidents, Reports, duplicate review, verification, SLA/escalations, maps, analytics, scoped workforce.
- **City admin:** people/employee detail, organization, roles/permissions/scopes/delegations, invitations, geography, categories/routing, priority/SLA policies, moderation, assets/imports, privacy requests, integrations, system readiness.
- **Super admin:** tenant provisioning, cross-city configuration, reserved security/audit, service health, and bounded platform operations.

Navigation shows only implemented, authorized routes. Backend authorization remains decisive.

## 22. Test and Quality Strategy

### 22.1 Test layers

- **Unit:** transition graph, permissions, geofence, validation, duplicate scoring, priority calculation, SLA calendars, verification rules, canonical audit hashing, analytics formulas, health scoring, forecast evaluation.
- **Database integration:** migrations, transaction rollback, concurrency, row scope, job claims, outbox delivery, idempotency, signed-media authorization, aggregate rebuilds.
- **Provider contracts:** object storage, Groq mocked responses, email/SMS adapter when enabled, map tile failure behavior.
- **API integration:** validation, status codes, DTO redaction, pagination, ETags/entity versions, CSRF, rate limits, scope denial.
- **Socket integration:** auth, room isolation, ordered versioning, reconnect/backfill, duplicate event handling.
- **Component/accessibility:** keyboard, names, focus, dialogs/drawers, forms, live regions, charts/table alternatives, light/dark contrast.
- **Visual regression:** mobile/tablet/desktop for every primary route and role.
- **E2E:** golden flow plus negative, outage, retry, and concurrency scenarios.

### 22.2 Required E2E scenarios

1. Authenticated citizen happy path to `RESOLVED`.
2. Anonymous report plus one-time confirmation token.
3. AI outage at intake; report persists and later recovers.
4. Duplicate auto-link, manual review, rejection, merge, and unmerge.
5. Cross-city/zone/ward/department/worker access denial.
6. Field worker offline upload retry without duplicate resolution.
7. Verification rejection back to work and citizen dispute to `REOPENED`.
8. SLA escalation through all tiers exactly once.
9. Notification preference suppression and reconnect reconciliation.
10. Audit tamper detection.
11. Analytics and health-score reproducibility.
12. Asset import preview/apply/rollback.
13. Forecast failure without impact to core reporting.
14. Socio opt-in, redaction, revocation, comments, moderation, appeal, and underlying civic-record preservation.
15. Integration signature/replay/conflict recovery and complete tenant isolation.

### 22.3 Continuous integration gate

- Formatting/lint and strict TypeScript/Python checks.
- Unit and integration suites with ephemeral PostgreSQL and fake provider/storage adapters.
- Prisma migration from empty and supported upgrade fixture.
- API, web, worker, and ML builds.
- Dependency/secret scan and production configuration validation.
- Browser E2E smoke on each change; full role/golden/visual matrix on release candidates.

Live Groq, SMS, email, or paid infrastructure tests remain manual approval gates outside default CI.

## 23. Production Readiness and Release

### 23.1 Environments

- **Local:** deterministic Compose stack, seeded Indore dataset, fake provider/storage adapters, demo identities from environment variables.
- **CI:** ephemeral isolated database and storage/provider fakes; no shared secrets or paid calls.
- **Staging:** production-like Supabase/storage, restricted test data, migration rehearsal, full E2E and observability validation.
- **Production:** least-privilege credentials, private buckets, approved origins, backups/PITR, monitored workers, and controlled migration execution.

### 23.2 Security and privacy release gate

- Threat model and abuse cases for auth, anonymous reporting, uploads, signed URLs, tokens, map privacy, administrative exports, and AI prompts.
- No committed secrets or credentials; rotate any exposed development credential before release.
- Dependency, SAST, authorization, rate-limit, CSRF, upload polyglot/decompression, and audit-integrity checks.
- Document retention/deletion, consent, data minimization, breach response, and public/private fields.

### 23.3 Data and deployment gate

- Backup and restore drill succeeds.
- Forward migration and compatibility window are rehearsed; destructive changes use expand/migrate/contract.
- Worker and API versions tolerate mixed deployment during rollout.
- Feature flags protect M14–M25 decisions, policy activation, public scorecards, asset layers, forecasts, Socio, integrations, and tenant provisioning.
- Canary/rolling deployment, health validation, rollback, and incident runbook are documented.

### 23.4 Performance targets to approve and measure

- Define route-specific p95 latency budgets for public reads, authenticated queues, and mutations.
- Define image upload size/time budgets and background-job completion objectives.
- Define socket reconnect/reconciliation objective and analytics/forecast freshness objectives.
- Load-test map bbox queries, official queues, concurrent report creation, worker claims, signed URLs, and aggregate reads before production.

Targets become release gates only after representative staging measurement establishes realistic baselines.

## 24. Milestones and Exit Gates

### P0 — Accepted foundation

M1–M13 corrections plus UX0/UX1 accepted; database reachable; migrations/builds/tests pass.

### P1 — Trusted intake and operations UI

UX2–UX8 accepted for public, citizen, official, map, and field-worker workflows through `RESOLUTION_SUBMITTED`.

### P2 — Correct incident intelligence

M14 and M15 accepted with duplicate review and priority policy/override UI.

### P3 — Closed trust loop

M16 and M17 accepted; citizen confirmation/dispute, reopen, and audit verification work end to end.

### P4 — Honest accountability

M18, M19, UX9, and UX10 accepted; real analytics and health scores replace placeholders; legacy theme consumers are removed.

### P5 — Asset-aware intelligence

M20 and M21 accepted with safe imports, asset history, evaluated forecasting, provenance, and failure isolation.

### P6 — Safe civic participation

M22 and M23 accepted with consent, public redaction, ranking, engagement, moderation, appeals, and abuse controls.

### P7 — Interoperability and expansion

M24 and M25 accepted with approved adapters, reconciliation, tenant provisioning, and full isolation evidence.

### P8 — Production release candidate

Full role matrix, golden workflow, security/privacy review, accessibility audit, performance tests, migration rehearsal, backup restore, observability, and runbooks pass in staging.

## 25. Definition of Platform Completion

Civique is production-ready only when:

- M1–M25 are `VERIFIED`; M0 governance documents remain current.
- Every route uses the approved component system and theme, with no active `.premium-*` or page-level theme literals.
- All eight roles have useful, scope-correct navigation and workflows.
- Report and Incident remain distinct and all links are reversible/audited.
- Core reporting works during AI, notification-provider, socket, or analytics failure.
- No protected action relies on frontend visibility for authorization.
- Private identity/media never leaks through public map, analytics, sockets, logs, exports, or AI prompts.
- State transitions, duplicate decisions, priorities, routing, assignments, SLA, evidence, verification, citizen decisions, and policies are explainable and audited.
- The golden path reaches both `RESOLVED` and `REOPENED` correctly.
- Migrations, lint, typecheck, builds, unit/integration/E2E/accessibility/visual/security checks pass.
- Backups, restore, rollback, alerts, dashboards, and operational runbooks are proven.
- Documentation describes the deployed behavior, not intended or historical behavior.

## 26. Immediate Next Execution Plan

1. Reconcile module status documents and record exact M1–M13 acceptance evidence still missing.
2. Restore a reachable local PostgreSQL environment and apply migrations `0001`–`0010` non-destructively.
3. Install and run the missing test harnesses; make lint, typecheck, and builds deterministic.
4. Complete the M1–M13 foundation acceptance sweep in module order.
5. Implement and accept UX0, then UX1.
6. Demonstrate the pre-M14 vertical slice through `RESOLUTION_SUBMITTED`.
7. Request approval for M14 and implement it as the first post-M13 production module.

Do not start M15 until M14 and its paired UI are accepted. Continue this rule through M21.
