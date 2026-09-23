# Civique Execution and Acceptance Companion

> **Document role:** Detailed correction tasks and acceptance checks for the active implementation sequence. [`../Implementation.md`](../Implementation.md) is the sole authoritative product, architecture, security, UX, and module specification. Conflicts must be reconciled in favor of the master specification before implementation continues.

> **Status authority:** Current module status and verification evidence are recorded in [`ACCEPTANCE_MATRIX.md`](ACCEPTANCE_MATRIX.md). Historical completion language here is not production acceptance.

> **Status:** Proposed implementation sequence; implementation requires module-by-module approval.  
> **Last updated:** 2026-08-30  
> **Selected vision provider:** Groq  
> **Selected multimodal model:** `qwen/qwen3.8-27b`

## 1. Purpose

This document translates the master specification into correction tasks and acceptance checks for the current repository. It is not a competing source of product requirements or module status.

The repository contains meaningful prototype implementation across M1–M13, but the previous completion labels did not consistently prove security, privacy, state-machine correctness, production readiness, or acceptance criteria. Civique will therefore proceed in two stages:

1. Correct and formally accept M0–M13, one module at a time.
2. Implement M14–M25 only after the corrected foundation passes its gates, following the releases defined in the master specification.

No module is complete merely because its UI renders or an endpoint exists.

## 2. Execution Rules

For every module:

1. Confirm the module scope with the user.
2. Read this plan, `Implementation.md`, `docs/PROJECT_CONTEXT.md`, and affected code.
3. Inspect git status and preserve existing user work.
4. Identify data, API, frontend, AI, authorization, privacy, and migration impact.
5. Implement only the approved module and its minimum dependencies.
6. Add or update database migrations.
7. Add backend validation, authorization, consistent errors, and observability.
8. Add frontend loading, success, empty, error, and retry behavior.
9. Add unit, integration, and applicable E2E tests.
10. Run lint, strict typecheck, builds, migrations, and tests.
11. Verify every acceptance criterion with evidence.
12. Update project documentation and architectural decisions.
13. Present the result and wait for permission before the next module.

No push, commit, deployment, paid provider call, production mutation, or destructive operation is included unless explicitly authorized.

## 3. Module Definition of Done

A module may be marked complete only when all applicable items pass:

- Forward database migration and documented compatibility/rollback strategy.
- Backend input validation and consistent `/api/v1` contracts.
- Backend-enforced role and object-level authorization.
- Privacy-safe public/private response contracts.
- Frontend responsive and accessible states.
- Unit tests for business rules.
- Integration tests for database, storage, queue, AI, or real-time boundaries.
- E2E test for the module’s user workflow where applicable.
- Lint, strict TypeScript checks, API build, web production build, and worker build.
- Structured logs and health/readiness behavior.
- Updated `Implementation.md`, `PROJECT_CONTEXT.md`, `TASK_STATUS.md`, and ADRs when needed.
- Demonstrated acceptance criteria.

## 4. Target Architecture

### 4.1 Web Client

- Next.js citizen PWA, public map, municipal dashboard, and field-worker interface.
- No access or refresh tokens stored in `localStorage`.
- Shared validated API contracts.
- Mobile-first citizen and field-worker workflows.
- Desktop-first, responsive administration workflows.

### 4.2 Core API

- Express/TypeScript owns authentication, authorization, transactions, state transitions, routing, SLA policy, public DTOs, and audit orchestration.
- Prisma/PostgreSQL is the system of record.
- All important writes emit an outbox event in the same database transaction.

### 4.3 Durable Worker

- PostgreSQL-backed jobs/outbox initially, preserving the existing PostgreSQL-first architecture.
- Jobs claimed using safe locking such as `FOR UPDATE SKIP LOCKED`.
- Idempotency keys, leases, retries, exponential backoff, observability, and dead-letter state.
- Executes media processing, AI analysis, duplicate processing, SLA events, notifications, analytics, and forecasts.
- Redis/BullMQ remains a future scaling option requiring a separate decision.

### 4.4 Media and Storage

- Private originals in Supabase Storage or an equivalent private object store.
- Validated, normalized derivatives for display and AI processing.
- Short-lived signed URLs where a URL is required.
- SHA-256 content hashes, randomized object names, retention metadata, and immutable evidence provenance.

### 4.5 AI and ML

- FastAPI owns deterministic image decoding, normalization, quality checks, embeddings, and provider-neutral AI integration.
- Groq Qwen 3.8 performs advisory multimodal interpretation.
- Business rules and authorized humans own final civic decisions.
- Core reporting continues when AI is unavailable.

## 5. Groq Qwen 3.8 Decision

### Model

- Provider: Groq.
- Model ID: `qwen/qwen3.8-27b`.
- Input: text and images.
- Planned uses:
  - report image validation and category suggestion;
  - evidence relevance and quality signals;
  - uncertain duplicate-pair adjudication;
  - advisory urgency/severity signals;
  - before/after resolution comparison.

### Boundaries

- The API key is server-side only in `GROQ_API_KEY`.
- The configurable model is stored in `GROQ_MODEL`.
- Strict JSON Schema output is used and validated again locally.
- Citizen identity, phone, email, tokens, and unnecessary metadata are never included in prompts.
- Each analysis stores provider, model, prompt version, schema version, request hash, status, timestamps, latency, token usage, structured output, and error/refusal state.
- Qwen cannot independently merge incidents, set final priority, or resolve incidents.
- Provider timeouts, rate limits, refusals, schema failures, and outages result in `PENDING` or `REVIEW_REQUIRED`, followed by retry or human review.
- Live calls may create costs and require explicit permission and a user-provided API key.

### Important M14 Boundary

Groq vision does not replace a scalable vector candidate index. M14 will use deterministic local 1024-dimensional image embeddings for candidate retrieval. Qwen will review only borderline candidate pairs after spatial, temporal, category, and cosine-similarity filtering.

---

# Stage A — Correct Existing Modules M0–M13

## M0 — Product Truth and Governance Reset

### Current Truth

The product specification exists, but completion records contradict code and omit known problems.

### Goal

Create and reconcile one authoritative master specification before further feature implementation.

### Deliverables

- Use only `VERIFIED`, `PARTIAL`, `BLOCKED`, or `NOT STARTED` for module status.
- Replace Gemini as the planned provider with provider-neutral AI architecture and Groq Qwen 3.8.
- Define Report versus Incident ownership and terminology.
- Define public versus private data boundaries.
- Define lifecycle command ownership and the module dependency graph.
- Adopt the Definition of Done from this document.
- Record approved architectural decisions.
- Add and maintain the module evidence registry in `docs/ACCEPTANCE_MATRIX.md`.

### Tests and Review

- Cross-check every documented endpoint and module claim against code or an executable test.
- Ensure master documents agree on current module and next task.

### Acceptance Gate

- Project documents agree on current state.
- Known issues are recorded.
- The user approves M1 before implementation begins.

## M1 — Infrastructure and Reliable Execution

### Current Truth

Services compile; the configured remote database is still unreachable in this environment. M1 now includes a non-destructive Prisma baseline, liveness/readiness endpoints, and a durable PostgreSQL worker. Migration runtime and web production build verification remain environment-blocked.

### Goal

Create a reproducible, observable baseline with durable background jobs.

### Deliverables

- Inventory and preserve the current dirty worktree.
- Establish a non-destructive Prisma migration baseline.
- Restore documented local PostgreSQL connectivity and define the production Supabase pooler configuration.
- Add `/health` for liveness and `/ready` for database, storage, worker, and AI dependency readiness.
- Add PostgreSQL `Job`, `OutboxEvent`, and optional `ServiceHeartbeat` records with required indexes.
- Replace the mock worker with job claiming, leases, retries, backoff, idempotency, and dead-letter handling.
- Add structured logging with request ID, module, operation, entity IDs, status, duration, and safe error type.
- Make root build/test/lint scripts correct and deterministic.
- Self-host fonts or provide a deterministic production build strategy.
- Fail startup when required production configuration is missing.

### Tests

- Fresh-database migration test.
- Job claim, retry, lease-expiry, idempotency, restart, and dead-letter tests.
- API, web, and worker lint/typecheck/build checks.
- Accurate liveness/readiness tests under dependency failure.

### Acceptance Gate

- One documented command starts all local services.
- Readiness accurately reflects dependencies.
- A queued job survives restart and executes once.
- Lint, typecheck, and builds pass.

## M2 — Authentication, Sessions, and Scoped Authorization

### Current Truth

JWT endpoints exist, but users can choose privileged roles during registration, secret fallbacks are insecure, refresh tokens are not revocable, and object-level scope is inconsistent.

### Goal

Make identity and authorization safe for citizen and municipal data.

### Deliverables

- Public registration always creates `CITIZEN`.
- Privileged users are created through scoped invitations or authorized administration.
- Add `UserSession` with hashed refresh token, family ID, expiry, rotation, revocation, and reuse detection.
- Use short access-token lifetime and rotating refresh tokens.
- Move web authentication to Secure, HttpOnly, SameSite cookies with CSRF protection.
- Remove token storage from `localStorage`.
- Add `/auth/me`, session listing, logout-one, logout-all, password recovery, and invitation acceptance.
- Centralize the eight-role permission matrix.
- Centralize resource policies for city, zone, ward, department, assignment, and citizen ownership.
- Load the active database user for protected operations instead of trusting stale token claims alone.
- Rate-limit register, login, refresh, invitation, and recovery endpoints.

### Tests

- Permission matrix for all eight roles.
- Cross-city, cross-zone, cross-ward, cross-department, cross-worker, and cross-citizen denial tests.
- Refresh rotation, reuse, expiry, suspension, revocation, and logout tests.
- CSRF and cookie security tests.

### Acceptance Gate

- A citizen cannot self-register as an official.
- A field worker cannot access another worker’s assignment.
- Revoked or reused refresh tokens cannot create new access tokens.

## M3 — Civic Geography and Spatial Correctness

### Current Truth

The 85-ward Indore dataset and ray-casting resolver exist, but versioning, topology validation, indexes, and safe import behavior are incomplete.

### Goal

Make geography deterministic, versioned, validated, and scalable.

### Deliverables

- Add geography import source, checksum, version, effective date, and import status.
- Validate GeoJSON type, coordinate ranges, closed rings, polygon validity, duplicate ward identities, and overlaps.
- Add indexes for geographic foreign keys and incident map filters.
- Keep the tested TypeScript ray-casting implementation initially.
- Introduce PostGIS only after a benchmark and approved ADR.
- Return explicit out-of-service results.
- Replace destructive normal seeding with preview, validation, and idempotent import.

### Tests

- All 85 ward centroids resolve correctly.
- Boundary, hole, MultiPolygon, malformed, overlap, and out-of-service fixtures.
- Bbox query correctness and performance.

### Acceptance Gate

- Valid test coordinates resolve deterministically.
- Invalid geography is rejected before writes.
- Repeated imports do not delete unrelated data.

## M4 — Secure Citizen Reporting

### Current Truth

The report form works, but upload security trusts client MIME metadata, originals are public, privacy retention is undefined, and capture claims are not verified.

### Goal

Accept trustworthy evidence while supporting anonymous and authenticated reporting.

### Deliverables

- Add `MediaAsset`, `ReportTrackingToken`, consent, evidence validation, and retention metadata.
- Store originals privately and expose signed derivatives only.
- Inspect magic bytes, decode images, normalize orientation, strip unsafe metadata, validate dimensions, and reject corrupted or hostile files.
- Use cryptographically random object keys and SHA-256 hashes.
- Validate coordinates, timestamp plausibility, descriptions, taxonomy values, phone format, and rate limits.
- Use hashed anonymous tracking tokens.
- Persist capture source honestly; do not label arbitrary uploads `CAMERA_LIVE`.
- Persist the report before AI and queue analysis afterward.
- Compensate safely when storage succeeds but the database transaction fails.

### Tests

- Valid JPEG, PNG, and WebP.
- Spoofed MIME, corrupt file, oversize file, decompression bomb, malicious metadata, and unsupported format.
- Anonymous and authenticated submission.
- Storage, database, worker, and AI failure paths.

### Acceptance Gate

- A valid report succeeds when Groq is unavailable.
- Original evidence is not publicly enumerable.
- Invalid files never reach storage or Groq.

## M5 — Report-to-Incident Engine and State Machine

### Current Truth

Report and Incident are separated, but duplicate choice is ignored, arbitrary transitions remain possible, and concurrency can create inconsistent incidents.

### Goal

Create incidents atomically through one authoritative lifecycle service.

### Deliverables

- Create a transition service defining source state, target state, permitted actors, required evidence, side effects, and audit event.
- Replace generic status mutation with explicit commands: acknowledge, assign, start, submit resolution, verify, confirm, dispute, reopen, reject, and escalate.
- Add request idempotency and transaction locking for concurrent report ingestion.
- Store versioned duplicate decisions with automatic, suggested, and human-confirmed outcomes.
- Honor or explicitly reject the citizen-selected duplicate candidate.
- Emit outbox events in the same transaction as lifecycle changes.
- Maintain consistent incident report counts and evidence lists transactionally.

### Tests

- Full valid and invalid transition matrix.
- Concurrent report creation and idempotency.
- Transaction rollback and outbox atomicity.
- Duplicate choice and reversal.

### Acceptance Gate

- No endpoint can jump directly from `OPEN` to `RESOLVED`.
- Every transition produces one audit/outbox event.
- Report/incident aggregates remain consistent under concurrency.

## M6 — Privacy-Safe Public Live Map

### Current Truth

The live map works, but public responses include nested Report data and do not consistently enforce `isPublic`.

### Goal

Provide public transparency without exposing citizens or private evidence.

### Deliverables

- Create explicit allow-listed `PublicIncidentSummary` and `PublicIncidentDetail` DTOs.
- Never serialize Prisma records directly to public clients.
- Filter by `isPublic` and approved lifecycle states.
- Remove submitter references, contact information, anonymous tokens, device metadata, originals, and private audit data.
- Add cursor pagination, bbox limits, category/status validation, and maximum viewport area.
- Use safe public media derivatives and reduce precision for sensitive categories where required.
- Add marker clustering and an accessible list alternative.

### Tests

- Public privacy contract snapshots.
- Non-public incident exclusion.
- Bbox, pagination, category, status, and query-limit tests.
- Responsive and accessibility E2E tests.

### Acceptance Gate

- Public JSON contains no citizen contact information or private media URL.
- Non-public incidents never appear.
- Unbounded queries are rejected or paginated.

## M7 — Authenticated Real-Time Communication

### Current Truth

Socket.IO broadcasts work, but CORS is open and clients can request arbitrary user rooms.

### Goal

Apply REST-equivalent authorization to real-time delivery.

### Deliverables

- Authenticate the Socket.IO handshake and load the active database user.
- Derive personal and scope rooms on the server; remove client-selected user-room membership.
- Separate public and private event DTOs.
- Publish committed outbox events from the worker.
- Add versioned event envelopes containing event ID, entity ID, type, timestamp, and redacted payload.
- Add reconnect/backfill through `lastEventId` or a scoped events endpoint.
- Restrict origins, payload size, connection rate, and subscription scope.

### Tests

- Room impersonation and cross-scope denial.
- Reconnection, missed-event recovery, and duplicate delivery.
- Public payload privacy.

### Acceptance Gate

- A citizen cannot subscribe to another user’s notifications.
- Officials receive only authorized scope events.
- Reconnected clients reconcile without duplicate state.

## M8 — Real Municipal Admin Console

### Current Truth

Overview and incident operations use live APIs, while People, Analytics, Settings, and some triage controls remain static or no-op.

### Goal

Make every enabled administrative action truthful, scoped, and persisted.

### Deliverables

- Replace mock people with scoped, paginated directory APIs.
- Implement invitations, activation, suspension, and role/scope administration.
- Connect Promote/Merge to real M5 commands or disable them until available.
- Persist settings through authorized APIs.
- Remove hard-coded analytics until M18.
- Add role-specific queues, server-side filters, accessible dialogs, and complete operation states.
- Replace `any` in touched contracts with validated shared types.

### Tests

- Role-specific visibility and action E2E tests.
- Cross-scope API denial.
- Enabled-control truthfulness checks.
- Accessibility for forms, dialogs, navigation, and tables.

### Acceptance Gate

- Every enabled control performs real authorized work.
- Mock operational users and metrics are removed.
- Cross-scope records are not returned.

## M9 — Department Routing and Ownership

### Current Truth

Basic routing exists, but free-form category arrays, incomplete taxonomy coverage, and assignment scope gaps remain.

### Goal

Route every supported category deterministically and safely.

### Deliverables

- Add normalized `Category`, `RoutingRule`, and `RoutingDecision` models.
- Version rules by city, category/ward, effective dates, priority, and deterministic tie-breaking.
- Cover the complete UI/Groq taxonomy.
- Validate department and worker city, ward, department, role, and active status.
- Record old/new SLA and routing reasons when assignments change.
- Provide scoped admin preview, activation, and rollback.

### Tests

- Full taxonomy routing matrix.
- Fallback, overlapping rule, and effective-date behavior.
- Cross-city/ward/department assignment denial.

### Acceptance Gate

- Every active category has one deterministic route or explicit manual review.
- Workers outside scope cannot be assigned.
- Every routing decision is explainable and audited.

## M10 — Field Worker Operations and Evidence

### Current Truth

Start-work and after-photo submission exist, but immutable work orders, GPS/time evidence integrity, and offline behavior are incomplete.

### Goal

Capture trustworthy field execution without treating submission as final resolution.

### Deliverables

- Add `WorkOrder`, assignment history, and `ResolutionSubmission` models.
- Require active assignment, valid state, notes, validated after-media, capture timestamp, and GPS tolerances.
- Process resolution media through the M4 private pipeline.
- Support idempotent offline draft sync.
- Keep `RESOLUTION_SUBMITTED`, `AI_VERIFICATION`, and `RESOLVED` distinct.
- Provide a mobile-first queue, task detail, upload progress, retry, and error experience.

### Tests

- Wrong worker, stale assignment, wrong state, and duplicate submission.
- GPS/timestamp tolerance and evidence integrity.
- Offline retry E2E.

### Acceptance Gate

- Evidence submission never directly resolves an incident.
- Every action references one active assignment.
- Evidence has immutable media/GPS/time provenance.

## M11 — Durable SLA and Tiered Escalation

### Current Truth

An in-process interval performs one-time escalation and is unsafe across multiple API replicas.

### Goal

Make SLA monitoring durable, idempotent, configurable, and tiered.

### Deliverables

- Add versioned `SlaPolicy`, `IncidentSla`, and `SlaEscalationEvent` models.
- Define timezone, working calendar, pause/resume, and citizen-wait behavior.
- Schedule unique SLA jobs from lifecycle events instead of scanning every record.
- Implement warning, Tier 1, Tier 2, and commissioner escalation.
- Deduplicate notifications and protect escalation with job idempotency.
- Provide scoped policy preview and breach history.

### Tests

- Timezone, DST, holidays, pause/resume, reassignment, and every escalation tier.
- Multiple-worker idempotency and retry.
- No duplicate notification under repeated job delivery.

### Acceptance Gate

- Every active incident has one explainable SLA state.
- Each escalation tier fires once at the correct time.
- Restarts do not lose or duplicate escalation.

## M12 — Notification Platform

### Current Truth

In-app notifications work; email and SMS are currently UI claims rather than actual provider delivery.

### Goal

Build preference-aware, retryable delivery without false channel claims.

### Deliverables

- Separate Notification, DeliveryAttempt, Template, and Preference records.
- Complete and secure in-app notifications first.
- Mark email/SMS unavailable until a provider is explicitly approved and configured.
- Add adapter contracts, idempotency, retry/backoff, and permanent failure states.
- Apply recipient scope and user preferences.
- Persist profile preferences through APIs.
- Deliver real-time notifications through server-derived private rooms.

### Tests

- Recipient selection, suppression, duplicate event, retry, and permanent failure.
- Secure socket delivery.
- Mocked provider adapter contracts.

### Acceptance Gate

- In-app notifications are durable and private.
- Preferences suppress eligible delivery.
- UI never reports email/SMS success without a real successful attempt.

## M13 — Groq Qwen 3.8 Multimodal Classification

### Current Truth

ConvNeXt/ImageNet mapping and keyword fallback are active. Gemini provider code exists but is not connected to the active route.

### Goal

Replace Gemini and pseudo-classification with auditable Groq multimodal analysis while keeping reporting failure-safe.

### Deliverables

- Remove Gemini dependencies/provider code during this module.
- Add provider-neutral `VisionAnalysisProvider` and `GroqVisionProvider`.
- Configure `GROQ_API_KEY`, `GROQ_MODEL=qwen/qwen3.8-27b`, timeouts, feature flags, and spending/rate caps.
- Create safe local derivatives before any provider call.
- Use strict JSON Schema for category, evidence relevance, observed facts, uncertainty, quality flags, confidence band, and alternatives.
- Require separate `civic_relevance`, `decision`, and `authenticity` fields. An authentic but irrelevant logo, advertisement, document, screenshot, product, or unrelated image must be rejected as non-civic evidence; authenticity alone must never imply civic validity.
- Generate image-specific follow-up questions only for `ACCEPT` or `REVIEW_REQUIRED`; rejected evidence must return no questions and a citizen-safe replacement-evidence message.
- Present those questions in a dedicated pre-insight citizen dialog. Each question must expose exactly three answer choices; the selected answers are sent in a second Groq pass before detailed insights are shown.
- Use low-latency instruct mode for intake classification.
- Add `AiAnalysis` and prompt/schema version metadata.
- Queue final classification after report persistence.
- Keep optional draft preview best-effort and independently rate-limited.
- Retry timeout, 429, transient error, refusal, and schema failure safely.
- Build a labeled evaluation dataset and approved thresholds.
- Preserve citizen and operator override.

### Tests

- Mocked success, strict schema, timeout, 429 `Retry-After`, refusal, malformed response, and outage.
- Golden image set for every category, invalid evidence, irrelevant images, and ambiguous scenes.
- One explicitly approved live canary test outside default CI.

### Acceptance Gate

- Active analysis records `qwen/qwen3.8-27b` and all provenance.
- Reports persist when Groq is unavailable.
- Draft UI and post-persistence worker prevent rejected non-civic evidence from being applied as a civic report; ambiguous evidence remains reviewable.
- AI suggestions are traceable and overridable.
- Gemini is no longer part of the active or planned architecture.

---

# Stage B — Complete Core Trust Modules M14–M17

## M14 — Duplicate Detection Pipeline

### Goal

Cluster repeat reports using deterministic candidate retrieval and explainable adjudication.

### Deliverables

- Generate versioned 1024-dimensional local ConvNeXt-Base embeddings from validated derivatives.
- Retrieve candidates using city, active status, category compatibility, distance, and time window.
- Combine cosine similarity, distance, time, taxonomy compatibility, SHA-256, and perceptual hash.
- Use Qwen pairwise vision analysis only inside an uncertain score band.
- Produce `AUTO_LINK`, `SUGGEST_REVIEW`, or `NEW_INCIDENT` with reason codes.
- Add reversible merge/unmerge and operator review.
- Recompute cluster counts/centroids transactionally.

### Tests

- Labeled positive/negative duplicate pairs.
- Precision/recall threshold evaluation.
- Dense-location false positives and concurrent reports.
- Qwen uncertain-band failure and fallback.

### Acceptance Gate

- Nearby but visually distinct problems are not automatically merged.
- Approved duplicate accuracy thresholds are met.
- Links are explainable, reversible, and audited.

## M15 — Priority and Urgency Engine

### Goal

Compute an explainable 0–100 priority score without giving AI final authority.

### Deliverables

- Version deterministic weights for category risk, location sensitivity, report density, age, SLA proximity, and verified severity signals.
- Use Qwen only for advisory obstruction, hazard, scale, and visible-impact signals.
- Map 0–100 scores to priority levels with reason codes.
- Add scoped override with reason, expiry, and audit event.
- Recalculate idempotently on relevant events.

### Tests

- Boundary, monotonicity, deterministic replay, and manipulation-resistance tests.
- Override authorization and expiry.

### Acceptance Gate

- Same inputs and policy version reproduce the score.
- Component contributions are visible.
- Overrides are scoped, reasoned, and audited.

## M16 — Resolution Verification and Citizen Confirmation

### Goal

Close Civique’s trust loop through evidence, rules, Groq analysis, and citizen participation.

### Deliverables

- Validate before/after media, capture time, GPS distance, quality, and assignment provenance.
- Send representative before and after images to Qwen using strict JSON Schema and appropriate reasoning effort.
- Capture observed change, issue presence before/after, relevance, ambiguity, and manipulation flags.
- Combine AI output with deterministic rules into `VERIFIED`, `REVIEW_REQUIRED`, or `REJECTED`.
- Move accepted evidence to `CITIZEN_CONFIRMATION` rather than `RESOLVED`.
- Implement authenticated and secure anonymous-token confirmation/dispute.
- Use an explicit timeout policy requiring business-rule or administrative handling.
- Reopen and create a new work order after a valid dispute.

### Tests

- Fixed, not fixed, ambiguous, manipulated, wrong-location, and low-quality image pairs.
- Groq outage/refusal and human review.
- Citizen ownership, token, timeout, dispute, and reopen E2E.

### Acceptance Gate

- Qwen alone cannot resolve an incident.
- Resolution requires valid evidence, rules, and citizen/policy decision.
- The golden flow reaches both `RESOLVED` and `REOPENED` correctly.

## M17 — Verifiable Audit Trail

### Goal

Make critical civic activity complete, append-only, tamper-evident, and independently verifiable.

### Deliverables

- Canonicalize event serialization.
- Include event ID, entity version, actor, action, timestamp, before/after hashes, and previous hash.
- Serialize appends per incident to prevent chain forks.
- Audit security, reports, duplicates, routing, assignments, lifecycle, SLA, AI, overrides, evidence, and citizen decisions.
- Add chain verification, broken-link reporting, and scoped export.
- Enforce append-only application/database permissions.
- Separate public redacted timeline from private forensic audit data.

### Tests

- Hash determinism and modification, deletion, reordering, and insertion detection.
- Concurrent append behavior.
- Critical-command audit coverage.

### Acceptance Gate

- Valid chains verify deterministically.
- Tampering is detected.
- Every critical transition and AI/human override appears in the chain.

---

# Stage C — Civic Intelligence M18–M21

## M18 — Public Accountability and Analytics

### Goal

Replace hard-coded analytics with real, privacy-safe municipal performance data.

### Deliverables

- Version formulas for intake, acknowledgement, assignment, resolution, reopen, breach, and confirmation metrics.
- Compute daily city/zone/ward/department/category aggregates.
- Replace all placeholder rankings and charts.
- Apply minimum-cohort privacy suppression.
- Add filters, comparisons, accessible charts, CSV export, and freshness timestamps.

### Acceptance Gate

- Every number traces to events and a formula version.
- Public analytics contain no personal data.
- Rankings reproduce from the same aggregate snapshot.

## M19 — Civic Health Score

### Goal

Create a transparent, versioned ward health index.

### Deliverables

- Normalize unresolved burden, severity, SLA compliance, recurrence, resolution quality, and citizen confirmation.
- Version weights and show confidence for sparse data.
- Compute nightly and retain history.
- Render score, component, trend, and heatmap views.
- Provide non-mutating administrative what-if preview.

### Acceptance Gate

- Scores reproduce from policy and aggregate snapshot.
- Score changes are explainable.
- Sparse data displays uncertainty rather than false precision.

## M20 — Civic Asset Registry

### Goal

Link incidents to municipal infrastructure and accountable ownership.

### Deliverables

- Model asset types, identifiers, owner, geometry, condition, dates, and lifecycle state.
- Add validated, versioned CSV/GeoJSON import with preview and rollback.
- Link reports/incidents to assets with confidence and human correction.
- Show asset history, incidents, maintenance events, and map layers.
- Define public and restricted fields by asset type.

### Acceptance Gate

- Incident/asset links preserve Report identity.
- Asset history is audited.
- Imports cannot silently overwrite unrelated assets.

## M21 — Predictive Civic Intelligence

### Goal

Forecast civic hotspots responsibly with measurable accuracy and explicit uncertainty.

### Deliverables

- Build privacy-safe spatial/time aggregates and reproducible datasets.
- Start with seasonal/statistical baselines.
- Add Prophet only if backtesting materially beats the baseline.
- Version dataset, features, model, horizon, and evaluation.
- Schedule training/inference with failure isolation and drift monitoring.
- Display confidence intervals, forecast date, and model version.
- Compare predicted versus observed incidents and collect operator feedback.

### Acceptance Gate

- Selected forecasting beats the documented held-out baseline.
- Every prediction includes uncertainty and provenance.
- Forecast failure never interrupts core reporting.

---

# Stage D — Civic Participation, Interoperability, and Expansion M22–M25

The authoritative scope and acceptance requirements for M22 Civique Socio Publishing, M23 Engagement and Moderation, M24 Government and Channel Integrations, and M25 Multi-City Control Plane are defined in `Implementation.md`. Detailed execution checklists for these modules must be added here only when their prerequisite release gates pass; their absence from the active P0 checklist does not authorize early implementation.

---

# 6. Golden E2E Workflow

The platform is not release-ready until the following passes using real local services and test providers:

1. Citizen registers or continues anonymously.
2. Citizen submits a validated private image and valid coordinates.
3. Report persists while Groq analysis is queued.
4. Geography resolves to the correct ward.
5. Qwen returns a structured suggestion or the report remains pending safely.
6. Duplicate pipeline creates or links an Incident correctly.
7. Incident appears on the redacted public map.
8. Correct department and SLA policy are selected.
9. Authorized officer acknowledges and assigns a scoped field worker.
10. Assigned worker starts the work order.
11. Worker uploads validated resolution evidence with GPS/time provenance.
12. Rules and Qwen produce a resolution verification outcome.
13. Citizen confirms or disputes through an authorized mechanism.
14. Incident becomes `RESOLVED` or `REOPENED` through the state machine.
15. Notifications, SLA state, analytics, and real-time clients reconcile.
16. The complete audit chain verifies.

# 7. Immediate Next Gate

**M0 — Product Truth and Governance Reset is implemented and awaiting user review.**

After the user approves the M0 documentation and status changes, the next implementation task is **M1 — Infrastructure and Reliable Execution**. No M1 or M14 code changes should start before that approval.
