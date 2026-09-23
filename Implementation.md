# Civique Production-Grade Master Implementation Specification

**Product:** Civique

**Operating model:** Indore-first, IMC-ready pilot

**Document status:** Authoritative product, architecture, security, UX, and module specification

**Last reviewed:** 2026-09-20

**Current delivery stage:** P0 — correction and acceptance of the existing M1–M13 foundation

This document is the single source of truth for what Civique is intended to become and the order in which it will be delivered. It supersedes competing architectural or module definitions in older planning documents. Supporting documents have narrower responsibilities:

- [`docs/PRODUCTION_DELIVERY_PLAN.md`](docs/PRODUCTION_DELIVERY_PLAN.md) records release sequencing and dependency gates.
- [`docs/UI_IMPLEMENTATION_PLAN.md`](docs/UI_IMPLEMENTATION_PLAN.md) records detailed screen, interaction, responsive, and component requirements.
- [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) is the execution and acceptance companion for the active module.
- [`docs/ACCEPTANCE_MATRIX.md`](docs/ACCEPTANCE_MATRIX.md) records module status and verification evidence.
- [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md) records current repository truth and durable engineering context.
- [`docs/TASK_STATUS.md`](docs/TASK_STATUS.md) records only the active module and immediate work.
- [`docs/DECISIONS.md`](docs/DECISIONS.md) records material architectural decisions.

Historical completion labels do not override the acceptance matrix. A feature is not production-complete because its UI renders or because a prototype path exists.

---

## 1. Product Mission and Launch Boundary

Civique is an AI-assisted civic issue reporting, municipal operations, transparency, and public-participation platform. It is designed to close the loop between a citizen observing a problem and the responsible authority proving that the problem was resolved.

The first operating target is the city of Indore in Madhya Pradesh. Civique is being designed as an **Indore Municipal Corporation-ready pilot**. Until a formal integration and operating agreement exists, Civique must not claim to be an official IMC service, impersonate an authority, or imply that external departments are contractually bound to Civique SLAs.

The first production release is a bilingual Hindi/English responsive PWA with:

- authenticated and anonymous reporting;
- secure evidence capture;
- AI-assisted but citizen-confirmed form completion;
- transparent tracking and timelines;
- municipal role and workforce operations;
- in-app and email notifications;
- evidence-based resolution and appeal;
- a privacy-safe public map and accountability layer.

SMS, WhatsApp, IVR, kiosks, call-centre intake, and government-system synchronization are later adapter-based releases requiring explicit provider, cost, consent, and authority approval.

### 1.1 Product principles

1. **A report must never be lost because an optional service is unavailable.**
2. **AI advises; accountable humans and deterministic rules decide.**
3. **Report and Incident are different records and remain traceable.**
4. **Private evidence stays private unless a reviewed, redacted derivative is explicitly published.**
5. **Every lifecycle change is authorized, explainable, versioned, and audited.**
6. **Citizens see meaningful progress, ownership, SLA state, evidence, and closure basis.**
7. **Social popularity cannot replace civic risk, policy, or due process.**
8. **Core services remain usable on low-bandwidth mobile devices and with assistive technology.**
9. **Indore is the first tenant, not a hard-coded architectural exception.**
10. **No module is complete without database, backend, worker, UI, security, accessibility, observability, and test evidence.**

### 1.2 Non-goals for the first pilot

- Civique will not act as an emergency dispatch service. Emergency hazards are redirected to the appropriate service while an optional civic record may be retained.
- AI will not certify an image as definitively true or fake.
- AI will not independently merge incidents, assign workers, set final priority, or close incidents.
- Civique Socio will not provide direct messages, anonymous comments, unrestricted uploads, or public contact details.
- Public leaderboards, automated closure, Socio publishing, and external synchronization will remain feature-gated until their governance and safety acceptance gates pass.

---

## 2. Current Repository Truth

The repository contains meaningful implementation across M1–M13 and a substantial UI migration. This work is preserved and will be corrected incrementally rather than replaced wholesale.

### 2.1 Implemented or materially present

- npm workspace monorepo with Next.js, Express, a TypeScript worker, FastAPI, Prisma, PostgreSQL/Supabase, and Socket.IO.
- Cookie-based authentication, CSRF protection, refresh rotation, recovery, invitations, suspension, and eight legacy roles.
- Indore geography, ward resolution, report intake, private normalized media, Report/Incident separation, guarded workflow commands, public map DTOs, sequenced real-time events, routing, work orders, SLA state, notification delivery records, and Groq-backed classification.
- Dark Green Pro design tokens, shared primitives, public/citizen pages, municipal queues, incident workbench, people directory, analytics UI, and responsive navigation.
- Durable PostgreSQL job/outbox foundations, structured AI provenance, timeline events, and partial audit coverage.

### 2.2 Production gaps

- M1–M13 still require a complete role/scope, integration, accessibility, concurrency, recovery, and E2E acceptance sweep.
- Authorization still depends primarily on a single `User.role` enum rather than protected templates, custom roles, permissions, and scope grants.
- Duplicate detection, explainable priority, resolution verification, full audit integrity, public accountability aggregates, civic health, assets, predictions, and Socio are incomplete or absent.
- Some current pages remain large page-local implementations and include legacy hard-coded theme values.
- Email requires an approved provider canary; SMS and other external channels are not configured.
- Groq Qwen 3.8 is a configurable preview model and cannot be treated as a permanent production dependency.
- Most current work is uncommitted and must be preserved during every module.

### 2.3 Status vocabulary

- `NOT_STARTED`: no meaningful implementation exists.
- `PARTIAL`: implementation exists, but one or more production gates are missing.
- `BLOCKED`: an external dependency or approval prevents acceptance and is documented.
- `VERIFIED`: all applicable acceptance evidence exists and passes.

Only [`docs/ACCEPTANCE_MATRIX.md`](docs/ACCEPTANCE_MATRIX.md) assigns current module status.

---

## 3. Users, Organization, and Authorization

### 3.1 Protected system role templates

Civique retains eight protected role templates for consistent policy and migration compatibility:

- `CITIZEN`
- `FIELD_WORKER`
- `WARD_OFFICER`
- `DEPARTMENT_HEAD`
- `ZONAL_OFFICER`
- `COMMISSIONER`
- `CITY_ADMIN`
- `SUPER_ADMIN`

Public registration creates only `CITIZEN`. Privileged identities are created through an authorized invitation or employee-administration workflow.

### 3.2 Target RBAC and scope model

The single enum role is incrementally replaced as the authorization source by:

- `Permission`: stable namespaced capability such as `incident.assign` or `role.manage`;
- `Role`: protected system template or city-owned custom role;
- `RolePermission`: permission membership with reserved-permission controls;
- `UserRoleAssignment`: effective/expiry dates, status, approver, and reason;
- `ScopeGrant`: city, zone, ward, department, asset type, or assigned-resource scope;
- `Delegation`: temporary acting authority with start/end and revocation;
- `OrganizationUnit`: municipal hierarchy and reporting relationships;
- `EmploymentProfile`: employee number, designation, department, supervisor, skills, shift, availability, and non-public contact data.

Authorization is default-deny and evaluated on the backend from the active user, permission, resource, scope, assignment state, and delegation state. UI visibility never grants authority.

### 3.3 Reserved permissions and separation of duties

The following cannot be self-granted or included in unrestricted city-created roles:

- platform and cross-city administration;
- role and reserved-permission administration;
- audit integrity verification and forensic export;
- security configuration and credential operations;
- policy activation;
- privacy export/deletion approval;
- production integration activation.

Role creation and privileged assignment require distinct authority. A user cannot create a role and approve their own elevation. All changes require reason, entity version, audit event, and notification to affected users.

### 3.4 Migration strategy

1. Add role, permission, assignment, scope, delegation, organization, and employee tables additively.
2. Seed protected templates and stable permission keys.
3. Backfill existing `User.role` values into assignments and scopes.
4. Run legacy and target policy evaluation in comparison mode and log mismatches without granting additional access.
5. Move protected endpoints to target authorization module by module.
6. Retire direct enum authorization only after parity, denial, expiry, delegation, and rollback tests pass.

---

## 4. Target Production Architecture

### 4.1 Runtime boundaries

- **Next.js PWA:** public, citizen, field-worker, official, administrator, accountability, and Socio experiences.
- **Express API:** authentication, authorization, validation, lifecycle commands, routing, policy evaluation, signed media, and transaction orchestration.
- **PostgreSQL/Prisma:** system of record for identity, geography, Reports, Incidents, work, social content, evidence, policies, jobs, and audit.
- **Durable worker:** AI tasks, duplicate detection, priority, SLA scheduling, notifications, moderation assistance, analytics, and exports.
- **FastAPI AI gateway:** deterministic media analysis, embeddings, provider/model registry, structured inference, and evaluation.
- **Private object storage:** immutable originals, normalized private evidence, redacted public derivatives, thumbnails, and exports.
- **Socket.IO:** low-latency change hints; durable state and sequenced event backfill remain authoritative.
- **Integration adapters:** provider-neutral email first, followed by optional SMS, WhatsApp, IMC/311, e-Nagar Palika, and GIS connectors.

### 4.2 Core domain boundaries

- A **Report** is the immutable citizen submission and ownership/consent boundary.
- An **Incident** is the actionable civic problem and may aggregate multiple Reports.
- A **Work Order** records accountable operational execution for an Incident.
- A **Resolution Submission** records immutable worker evidence; it is not a resolution decision.
- A **Socio Post** is an optional redacted public projection referencing a Report or Incident; it never creates a duplicate official complaint.
- Routing, priority, SLA, verification, citizen decision, and closure each retain versioned decision records.
- Public projections never serialize raw database records.

### 4.3 Transaction, jobs, and events

Every critical mutation writes, in one database transaction:

1. domain state;
2. a canonical audit event;
3. a transactional outbox event;
4. any required idempotent jobs.

Workers claim PostgreSQL jobs with leases and `FOR UPDATE SKIP LOCKED`, renew leases for long work, retry with bounded exponential backoff, and dead-letter after policy limits. Every handler uses a stable idempotency key and records attempts, failure type, next retry, and safe diagnostics.

Event envelopes contain `eventId`, `schemaVersion`, `occurredAt`, `actorContext`, `requestId`, `entityType`, `entityId`, `entityVersion`, visibility, and a consumer-safe payload.

### 4.4 API rules

- All routes use `/api/v1` until an intentionally incompatible `/api/v2` is approved.
- Success responses use `{ success: true, data, meta? }`.
- Errors use `{ success: false, error: { code, message, fieldErrors?, requestId } }`.
- Params, query, headers, multipart fields, and bodies are validated at the boundary.
- Retryable commands require `Idempotency-Key`.
- High-conflict administration uses entity versions or ETags.
- Cursor pagination is used for timelines and feeds; bounded page pagination is allowed for admin tables.
- DTOs are explicit for public, citizen-owner, worker, official, administrator, and forensic views.
- Rate limits are keyed by authenticated user and privacy-safe network/device signals where necessary.

### 4.5 Reliability and observability

- `/health` reports process liveness; `/ready` reports required dependency readiness without exposing secrets.
- Structured logs include request ID, module, operation, safe actor/entity IDs, duration, result, and error type.
- Metrics cover API latency/errors, job age/retries/dead letters, storage failures, socket reconciliation, AI latency/refusals, SLA lag, notification delivery, moderation backlog, and aggregate freshness.
- Alerts and runbooks cover readiness loss, database saturation, job backlog, dead letters, signed URL failures, AI/provider outage, SLA evaluator lag, and backup failure.
- Pilot objectives are 99.9% monthly availability for submission/tracking, read p95 below 500 ms excluding media, core persistence within two seconds after upload acceptance, in-app updates within five seconds, email delivery within five minutes for 95% of accepted messages, RPO 15 minutes, and RTO four hours.

---

## 5. AI-Assisted Civic Workflow

AI is decision support. Every analysis stores provider, model, prompt version, schema version, request hash, input media hashes, status, latency, token/cost metadata where available, structured result, confidence, refusal/failure state, timestamps, and reviewer/override outcome.

### 5.1 Before submission

The intake pipeline performs:

1. actual media-type, integrity, corruption, pixel-count, animation, and decompression checks;
2. private original storage with randomized keys and immutable hash;
3. normalized, rotated, metadata-free private derivative creation;
4. blur, lighting, obstruction, screenshot, relevance, and evidence-quality assessment;
5. face, license plate, house number, document, and other sensitive-region detection for redacted public derivatives;
6. advisory manipulation-risk signals, never a definitive truth claim;
7. category, description, visible condition, severity signal, landmark, service, hazard, and accessibility-impact suggestions;
8. bounded category-specific questions generated from an approved question taxonomy;
9. emergency-risk detection and appropriate service redirection;
10. explicit citizen confirmation or correction of every suggested field.

Draft analysis may be synchronous within a strict timeout, but final Report persistence never depends on it. Provider failure returns `PENDING` or `REVIEW_REQUIRED`, preserves the draft, and queues retry.

### 5.2 After submission

- Resolve city, zone, ward, service area, and nearby assets from coordinates.
- Retrieve duplicate candidates using hash, visual embedding, distance, time, category, and active Incident state.
- Route uncertain, sensitive, suspicious, or unsupported Reports to human review.
- Calculate final priority from deterministic versioned policy; AI contributes only bounded advisory signals.
- Select department and triage owner through versioned routing rules and record the explanation.
- Start and update SLA state only through explicit policy events.

### 5.3 During resolution

- Verify active work-order ownership, evidence integrity, capture time, GPS distance, and media quality.
- Compare exact before/after derivatives for relevance, visible change, remaining defect, and ambiguity.
- Produce `VERIFIED`, `REVIEW_REQUIRED`, or `REJECTED` with deterministic and AI signal breakdowns.
- Require citizen confirmation or verified administrative closure after reminders and authorized review.
- Preserve appeal/reopen rights and show whether closure was citizen-confirmed or administratively approved.

### 5.4 Model registry and failure policy

Groq `qwen/qwen3.8-27b` may remain the initial configured vision model, but it is treated as preview and replaceable. The AI gateway maintains a model registry with capability flags, schema compatibility, allow-list, startup canary, timeout/rate limits, fallback order, and deprecation state. Production activation requires a labelled evaluation set and approved quality thresholds. A provider outage never blocks reporting, work execution, citizen tracking, or manual review.

---

## 6. Incident Lifecycle and Transparency

### 6.1 Guarded lifecycle

```text
REPORTED
  -> AI_REVIEW
  -> OPEN
  -> ACKNOWLEDGED
  -> ASSIGNED
  -> IN_PROGRESS
  -> RESOLUTION_SUBMITTED
  -> AI_VERIFICATION
  -> CITIZEN_CONFIRMATION
  -> RESOLVED
```

Additional guarded outcomes are `DUPLICATE`, `REJECTED`, `ESCALATED`, `DISPUTED`, and `REOPENED`. Each transition defines allowed prior states, permissions, object scope, required evidence, reason codes, transaction effects, audit/outbox events, notifications, and rollback/compensation behavior.

### 6.2 Citizen transparency matrix

The Report detail experience shows:

- public tracking reference and Report/Incident relationship;
- submitted evidence appropriate to the viewer;
- AI suggestions and human-confirmed values;
- assigned ward and responsible department;
- current status, plain-language meaning, and next expected action;
- SLA target, elapsed working time, risk, pauses, transfer history, and escalation tier;
- citizen-visible timeline events with source labels;
- before/after evidence and verification outcome;
- notification history and delivery state;
- confirmation, dispute, appeal, and reopen actions when eligible;
- closure basis and accountable approval category without leaking private employee data.

Internal notes, citizen identity, precise private location, employee personal contact data, security events, and unredacted evidence never appear in public projections.

---

## 7. Module Roadmap

Modules are implemented sequentially unless an explicitly documented dependency requires a bounded supporting change. Each module is a vertical slice: schema, domain policies, transactions, jobs/events, API, UI, authorization, error states, tests, observability, documentation, and acceptance.

### Release P0 — Correct and Accept the Existing Foundation

#### M0 — Product Governance

Unify the master specification, glossary, document authority, status evidence, module Definition of Done, risk register, privacy classifications, and release gates.

**Acceptance:** all planning documents agree on authority, current state, module numbering, and next gate; existing work is not falsely labelled verified.

#### M1 — Infrastructure and Reliable Execution

Deliver deterministic local/CI environments, migration rehearsal, job leases/retries/dead letters, health/readiness, configuration validation, structured logging, metrics, backups, restore tests, and runbooks.

**Acceptance:** clean and supported-upgrade migrations pass; API/web/worker/ML builds and checks are deterministic; lease recovery and restore drills succeed.

#### M2 — Identity, Sessions, and Account Security

Complete cookie sessions, CSRF protection, recovery, invitations, refresh replay defense, official MFA, session/device management, suspension, rate limiting, and security events.

**Acceptance:** public registration cannot create privilege; stolen/replayed tokens are contained; suspended and cross-scope users fail closed.

#### M3 — Geography and Jurisdiction

Version Indore boundaries, zones, wards, service areas, imports/checksums, address/geofence resolution, boundary exceptions, and multi-city tenant keys.

**Acceptance:** deterministic coordinate fixtures resolve correctly, imports are idempotent, unsupported areas return explicit serviceability results, and cross-city access is denied.

#### M4 — Secure Citizen Reporting

Deliver the bilingual guided wizard, camera/gallery/voice input, consent, private evidence, redacted derivatives, low-bandwidth upload, offline drafts, retry, anonymous tracking, and emergency redirection.

**Acceptance:** valid Reports persist during AI outage; hostile files fail safely; retries do not create duplicates; anonymous tracking reveals only authorized fields.

#### M5 — Report and Incident Engine

Enforce immutable Reports, Incident creation/linking, guarded transitions, concurrency, idempotency, review/rejection paths, and atomic audit/outbox behavior.

**Acceptance:** concurrent submissions never lose Reports or corrupt counts; arbitrary state jumps and unauthorized links are impossible.

#### M6 — Privacy-Safe Public Map

Deliver redacted map/list DTOs, generalized coordinates where required, clustering, filters, accessible list alternative, nearby issues, public detail, and reconnect reconciliation.

**Acceptance:** public clients cannot retrieve citizen identity, private notes, exact protected locations, or private evidence.

#### M7 — Durable Real-Time Events

Complete authenticated rooms, monotonic sequences, cursor backfill, retention, multi-instance delivery, entity-version reconciliation, and gap refetch.

**Acceptance:** room impersonation fails; reconnecting clients recover missed events exactly once from durable state.

#### M8 — Administration, RBAC, and Workforce

Deliver operational queues, protected/custom roles, permissions, scope grants, employee profiles, organization hierarchy, invitations, suspensions, delegations, shifts, availability, skills, workload, and audit history.

**Acceptance:** the full permission/scope matrix passes; custom roles cannot grant reserved capabilities; expired assignments/delegations stop working immediately.

#### M9 — Department Routing

Version service taxonomy, category ownership, ward/zone rules, routing precedence, previews, fallback desk, human overrides, and decision explanations.

**Acceptance:** every active category has one deterministic route or explicit manual review; cross-scope departments/workers are rejected.

#### M10 — Field Operations

Deliver mobile taskboard, assignment history, navigation, start/hold/complete commands, offline evidence drafts, safety notes, immutable resolution submissions, and rejection feedback.

**Acceptance:** only the active assigned worker may act; stale or duplicate evidence fails safely; offline retry is idempotent.

#### M11 — SLA and Escalation

Complete working calendars, holidays, category/severity policies, pauses with reasons, reassignment rules, warnings, tiered escalation, breach history, and durable scheduling.

**Acceptance:** identical events reproduce deadlines; pause/reassignment/concurrency tests pass; each tier fires once.

#### M12 — Notifications

Deliver in-app and email receipts, lifecycle updates, reminders, escalation messages, digests, preferences, templates, delivery attempts, retries, bounce/suppression handling, and safe deep links.

The current delivery slice persists user-owned notification records before external delivery, exposes bounded cursor pagination plus unread totals, returns server-generated allow-listed links, and treats Socket.IO as a reconnectable hint reconciled from the API. The citizen profile exposes in-app preference controls while provider-dependent email/SMS channels remain visibly unavailable until approved delivery providers and suppression policies are configured. Worker attempts remain retryable and idempotent; a queued or attempted message is never presented as delivered without provider confirmation.

**Acceptance:** recipients and preferences are correct; retries do not duplicate notifications; unconfigured channels never claim success.

#### M13 — AI Intake Intelligence

Complete relevance, quality, privacy redaction, manipulation-risk signals, classification, form suggestions, adaptive questions, model registry, provenance, evaluation, and human review. Authenticity and civic relevance are separate decisions: a real logo, advertisement, document, screenshot, product, or unrelated image is rejected as non-civic evidence, while ambiguous evidence remains reviewable. Image-specific follow-up questions are presented before detailed insights, with three choices per question; citizen answers are included in the second analysis pass.

The current intake slice exposes an advisory-only versioned model descriptor, preserves provider/model/schema provenance, returns image-specific adaptive questions for accepted or review-required evidence, and collects citizen answers as editable report context. Provider failure returns an honest pending/inconclusive result; durable submission and human review remain available. AI may reject the submitted image as non-civic evidence during intake, but no AI result independently resolves, assigns, prioritizes, or closes an Incident.

**Acceptance:** labelled evaluation and mocked provider matrices pass; uncertain/failed analysis never fabricates confidence or blocks submission.

**P0 exit gate:** the existing golden flow reaches `RESOLUTION_SUBMITTED`; cross-scope tests pass; web lint/accessibility gates pass; public DTOs leak no private identity or media; remaining external canaries are explicitly labelled.

### Release P1 — Close the Trust Loop

#### M14 — Duplicate Intelligence

Add versioned embeddings, candidate retrieval, component scoring, Qwen review only in an uncertain band, manual review workspace, reversible merge/unmerge, corroborating Reports, and quality measurement.

The current M14 slice adds explainable spatial/category/temporal candidate scoring, additive candidate and decision records, scoped municipal review APIs, and reversible Report-to-Incident linking without deleting citizen submissions. Visual similarity remains an optional bounded signal until an approved provider and labelled evaluation set meet the quality gate; popularity or ordinary Socio engagement cannot create an official duplicate link.

**Acceptance:** labelled positive/negative and dense-location cases meet approved precision/recall; every link is explainable, reversible, audited, and preserves Reports.

#### M15 — Explainable Priority Engine

Add versioned deterministic policies using category risk, sensitive location, verified severity, corroboration density, Incident age, SLA proximity, obstruction, and bounded AI signals. Add scoped overrides with reason, expiry, and revocation.

The current slice implements policy `m15-v1`, returns a signal-by-signal explanation, persists evaluations and temporary overrides, and exposes an operator workbench. Corroboration is bounded, AI is advisory, and ordinary social popularity is excluded from the score.

**Acceptance:** identical inputs reproduce the score; popularity alone cannot change it; every override is authorized, temporary where configured, and audited.

#### M16 — Resolution Verification and Citizen Decision

Add immutable verification records, deterministic checks, before/after analysis, official review, citizen confirmation/dispute, administrative closure, appeal, and reopen.

The current slice combines deterministic GPS/provenance checks with advisory before/after analysis, exposes scoped official review controls in the admin workbench and administrative-closure commands, persists citizen appeals with a seven-day window, and keeps all outcomes in the Incident timeline. A rollback-isolated integration harness exercises verification, citizen confirmation, administrative closure, appeal, and reopen after migration `0024_resolution_appeals` is applied. AI and citizen timeout alone cannot resolve an Incident.

**Acceptance:** verified resolution and reopen golden paths pass; no AI-only or timeout-only resolution is possible.

#### M17 — Verifiable Audit and Transparency Timeline

Add canonical event schemas, serialized per-entity hash chains, verification runs, safe projections, integrity alerts, and scoped forensic exports. The current slice adds migration `0025_verifiable_audit`, transaction-scoped canonical `m17-v1` audit writes, tamper verification/export APIs, and official workbench controls while preserving citizen-safe timeline projections.

**Acceptance:** modification, deletion, insertion, reorder, and chain forks are detected; all critical commands have coverage assertions.

### Release P2 — Accountability and Civic Intelligence

#### M18 — Public Accountability

Add versioned metric definitions, reproducible daily aggregates, privacy suppression, late-event correction, accessible public scorecards, scoped official analytics, and exports. The current slice adds migration `0026_accountability_metrics`, the `m18-v1` privacy-safe scorecard API, CSV export, and responsive `/accountability` UI with methodology/version disclosure.

**Acceptance:** every value reproduces from versioned events and no public cohort reveals personal information.

#### M19 — Civic Health

Add transparent ward health policies and snapshots using unresolved burden, severity, SLA compliance, recurrence, resolution quality, and citizen confirmation with completeness/uncertainty. The current slice adds migration `0027_civic_health`, versioned `m19-v1` scoring, public ward/detail/history/methodology APIs, official policy preview/creation, and responsive `/civic-health` UI.

**Acceptance:** every score traces to a policy and source snapshot; sparse data is suppressed or clearly qualified.

#### M20 — Civic Asset Registry

Add roads, drains, lights, bins, parks, water assets, ownership, geometry, condition, maintenance history, validated CSV/GeoJSON imports, QR identifiers, and Incident links. The current slice adds migration `0028_civic_assets`, preview-first checksum-idempotent imports, public-safe asset APIs, scoped Incident links, maintenance history, and responsive admin registry screens.

**Acceptance:** preview/apply/rollback and cross-city tests pass; imports cannot silently overwrite unrelated assets.

#### M21 — Predictive Intelligence

Add privacy-safe datasets, statistical hotspot/recurrence baselines, asset-failure signals, seasonal forecasts, uncertainty, evaluation, drift checks, failure isolation, and operator feedback. The current slice adds migration `0029_predictive_intelligence`, bounded `m21-baseline-v1` runs/cells, evaluation metadata, scoped feedback APIs, and `/admin/predictions` UI; predictions never create, prioritize, assign, or close work.

**Acceptance:** selected models beat documented held-out baselines and never create, prioritize, assign, or close civic work.

### Release P3 — Civique Socio

#### M22 — Socio Publishing and Feed

Add explicit per-Report opt-in, redacted public derivatives, citizen public aliases, Incident-linked posts, locality/category/status feeds, follows, saves, status updates, and shareable URLs. The current slice adds migration `0030_socio_publishing`, versioned consent history, non-persisting publication preview, redacted/generalized projections, cursor feeds, follows/saves, revocation, scoped official status updates, a production fail-closed feature gate, and responsive `/socio` pages.

**Rules:** revoking a post removes its public projection but never deletes the official Report, Incident, evidence, or audit history. Exact private locations and contact details are never public.

**Acceptance:** consent/version history, redaction, visibility, deletion projection, ranking, pagination, and privacy tests pass.

#### M23 — Engagement, Moderation, and Civic Trust

Add one support reaction per user, structured “I am also affected” corroboration, bounded threaded comments, content reports, moderation cases/actions, appeals, anti-spam/rate limits, blocks/mutes, civic reputation, and public community rules. The current slice adds migration `0031_socio_trust`, constrained engagement APIs, revision history, moderation queue/actions, appeals, controls, and post-detail engagement UI.

**Rules:** authenticated citizens interact under public aliases; no DMs or anonymous comments in v1. Feed ranking combines locality, relevance, recency, Incident state, safety, and diversity rather than maximizing engagement. Ordinary likes/comments never alter priority or SLA; verified corroboration may be a versioned M15 input.

**Acceptance:** spam, brigading, harassment, privacy leakage, moderation appeal, suspension, feed fairness, and underlying-record preservation tests pass.

### Release P4 — Interoperability and Expansion

#### M24 — Government and Channel Integrations

Add signed webhooks, external reference mapping, delivery receipts, import/export reconciliation, duplicate-safe synchronization, and adapters for approved IMC/311/e-Nagar Palika/GIS and communication channels. The current slice adds migration `0032_government_integrations`, timestamped HMAC inbox verification, monotonic sequence/order checks, unique replay-safe events, external-reference and delivery records with retry scheduling, conflict resolution, approval-token activation control, operator APIs, and a fail-closed admin control plane; provider adapters remain disabled until formal approval.

**Acceptance:** signature, replay, ordering, outage, conflict, redaction, and reconciliation tests pass before any live integration is enabled.

#### M25 — Multi-City Control Plane

Add tenant provisioning, city-specific geography/categories/policies/branding, feature flags, data-residency configuration, scoped operations, and bounded super-administration. The current slice adds migration `0033_multi_city_control_plane`, tenant settings, city feature flags, versioned policy activation, public-safe tenant configuration, super-admin provisioning, scoped admin APIs, and a responsive control-plane UI.

**Acceptance:** tenant-isolation suites pass across database, API, sockets, jobs, storage, exports, analytics, Socio, and integrations.

---

## 8. Civique Socio Product Contract

Civique Socio is a public participation layer, not a second complaint system.

### 8.1 Publication

- A citizen explicitly opts in after submitting a Report or from its detail page.
- The system creates a reviewed Socio projection from approved title, description, category, generalized location, public status, and redacted derivatives.
- The citizen selects a public alias and confirms a publication preview.
- Sensitive categories, minors, private property, vulnerable people, unredactable evidence, or active safety/investigation risks may be ineligible or require moderation.

### 8.2 Engagement semantics

- `SUPPORT` means civic interest, not proof or an official vote.
- `AFFECTED` is structured corroboration requiring location/eligibility checks and creates a traceable Report-support signal without copying another citizen’s evidence.
- Comments are authenticated, rate-limited, shallow-threaded, editable with revision history, and subject to community rules.
- Official status/timeline updates are visually distinct from citizen discussion.

### 8.3 Moderation and ranking

- Automated classifiers may flag spam, abuse, personal information, threats, sexual content, or manipulation, but moderators make consequential decisions.
- Moderation actions include limit visibility, redact, lock comments, remove projection, warn, suspend, and escalate; each requires reason and appeal path.
- Ranking is versioned and auditable. It balances locality, category preference, current civic state, recency, quality, diversity, and safety.
- Engagement velocity, coordinated accounts, repeated text/media, and network/device signals feed abuse review, not automatic civic dismissal.

---

## 9. UI Information Architecture

The accepted visual language is the current Dark Green Pro system: light `#fbfcf8` canvas, white surfaces, electric-lime primary actions, slate secondary actions, accessible semantic lifecycle colors, restrained shadows, and self-hosted interface typography. The redesign program extends this system; it does not replace the brand again.

### 9.1 Public and citizen routes

- `/`: public landing or authenticated citizen home.
- `/signin`, `/signup`, `/forgot-password`, `/reset-password`, `/accept-invitation`.
- `/report`: bilingual guided report wizard.
- `/report/[id]`: Report/Incident detail, transparency matrix, timeline, evidence, department/SLA journey, resolution decision, and appeal.
- `/profile`: Reports, drafts, preferences, sessions, privacy requests, and public alias.
- `/map`: redacted map plus accessible synchronized list.
- `/track`: anonymous/public tracking flow.
- `/socio` and `/socio/[postId]`: civic feed and post detail.
- `/accountability`, `/civic-health`, `/help`, `/privacy`, and `/accessibility`.

Existing routes remain compatible. New canonical aliases require explicit redirect and analytics plans rather than breaking links.

### 9.2 Field-worker routes

- `/worker`: today summary, urgent work, offline state, and safety notices.
- `/worker/tasks` and `/worker/tasks/[id]`: assigned work and complete task context.
- `/worker/map`, `/worker/history`, `/worker/notifications`, and `/worker/profile`.

Task detail prioritizes navigation, hazard context, evidence requirements, SLA, start/hold/submit actions, offline capture, and review feedback.

### 9.3 Municipal and administrative routes

Preserve `/admin`, `/admin/reports`, `/admin/incidents`, `/admin/incidents/[id]`, `/admin/people`, `/admin/analytics`, and `/admin/settings`. Add role-scoped routes for:

- triage and review tasks;
- duplicate review;
- resolution verification;
- SLA and escalations;
- categories and routing policies;
- people, employee detail, organization, roles, permissions, assignments, delegations, invitations, and sessions;
- moderation and appeals;
- audit and integrity;
- assets and imports;
- notification templates;
- privacy requests;
- integrations and external references;
- system health and job failures.

### 9.4 Component architecture

Complete source-owned primitives for Button, IconButton, Input, Textarea, Select, Combobox, Checkbox, RadioGroup, Switch, FormField, Card, Badge, Alert, Dialog, AlertDialog, Sheet, Drawer, Popover, Menu, Tooltip, Tabs, Accordion, Breadcrumb, Pagination, Table, Skeleton, Spinner, Progress, Toast, Command, Timeline, Uploader, and accessible charts.

Domain components include:

- `SmartReportWizard`, `EvidenceUploader`, `EvidencePreview`, `LocationPicker`, `AIAdvisoryPanel`, `AdaptiveQuestions`;
- `IncidentTimeline`, `TransparencyMatrix`, `SLAClock`, `DepartmentJourney`, `IncidentDataTable`;
- `DuplicateComparison`, `PriorityBreakdown`, `VerificationWorkspace`, `CitizenDecisionPanel`, `AuditIntegrityPanel`;
- `PermissionMatrix`, `EmployeeProfile`, `ScopeGrantEditor`, `DelegationDialog`, `OrganizationTree`;
- `SocioPost`, `SocioComposer`, `CommentThread`, `CorroborationDialog`, `ModerationQueue`;
- `MapShell`, `MapListAlternative`, `MetricCard`, `AccessibleChart`, `AssetSummary`, and `ForecastProvenance`.

Large page files are decomposed by feature only while their route contracts and working mutations remain covered.

### 9.5 Responsive and accessibility contract

- Validate at 360 px, 768 px, 1024 px, 1440 px, and large municipal displays.
- Mobile uses stacked cards, bottom sheets, thumb-reachable actions, and persistent draft state.
- Desktop uses dense but scannable tables, side sheets, saved filters, and multi-panel evidence workspaces.
- Meet WCAG 2.2 AA and applicable GIGW expectations: semantic landmarks, keyboard operation, visible focus, names/descriptions, errors tied to fields, live regions, reduced motion, non-colour status cues, accessible chart alternatives, 44 px targets, and Hindi typography/line-height review.
- Every data surface supports loading, empty, error, retry, stale, reconnecting/offline, permission denied, and success states.

---

## 10. Data and API Expansion

### 10.1 Identity and administration

Add target models and APIs for roles, permissions, assignments, scopes, delegations, organization units, employment profiles, shifts/availability, invitation batches, and security history. Commands require reason, idempotency, entity version, and audit.

### 10.2 Smart report contract

The target intake separates:

1. secure media intake;
2. advisory draft analysis;
3. citizen-confirmed fields and answers;
4. durable Report submission;
5. background final analysis, duplicate, routing, priority, and SLA jobs.

The citizen can submit when draft AI is unavailable. The API never accepts client-computed authority, priority, verification, or final routing.

### 10.3 Socio contract

Add models and APIs for public alias, publication consent, post, approved media projection, feed cursor, follows, saves, reactions, corroborations, comments/revisions, blocks/mutes, content reports, moderation cases/actions, appeals, and ranking version.

### 10.4 Privacy, retention, and deletion

- Classify fields as public, citizen-owner, operational, restricted, forensic, or secret.
- Define purpose and retention for identity, evidence, sessions, AI requests, logs, social content, exports, and backups.
- A citizen privacy request may delete or detach profile data but cannot erase legally/operationally required civic and audit records; those records are pseudonymized according to policy.
- Originals remain private. Public and AI consumers receive only the minimum reviewed derivative required for their purpose.
- All public endpoints, sockets, exports, and analytics use allow-listed DTOs and cohort/privacy rules.

---

## 11. Security, Privacy, and Abuse Protection

- Threat-model authentication, invitations, anonymous tracking, uploads, signed URLs, AI prompts, admin exports, Socio, integrations, and multi-tenancy.
- Enforce secure/HttpOnly/SameSite cookies, CSRF checks, password policy, official MFA, session revocation, and credential rotation.
- Scan dependencies and secrets; never log tokens, passwords, private evidence URLs, or sensitive citizen content.
- Treat image text and metadata as untrusted prompt input; never let model output select tools or privileged commands.
- Rate-limit report creation, tracking lookup, auth, uploads, reactions, comments, reports, exports, and webhooks.
- Detect spam, coordinated abuse, duplicate accounts, brigading, mass scraping, and enumeration without making opaque automated civic decisions.
- Provide moderation appeal, privacy request, breach response, backup/restore, and evidence-access runbooks.
- Apply least-privilege database, storage, provider, worker, and deployment credentials.

---

## 12. Testing and Production Acceptance

### 12.1 Required test layers

- **Unit:** transitions, permissions, scopes, routing, SLA, duplicate scoring, priority, verification, feed ranking, moderation, audit hashes, analytics, and health formulas.
- **Migration:** empty database, supported upgrade fixture, additive RBAC backfill, dual-policy parity, expand/migrate/contract behavior.
- **Database integration:** rollback, concurrency, job claims, outbox, idempotency, signed media, merge/unmerge, escalation, reactions, comments, and aggregates.
- **API integration:** validation, HTTP semantics, CSRF, rate limits, pagination, entity conflicts, DTO redaction, scope denial, suspension, and anonymous access.
- **Provider contracts:** object storage, Groq success/timeout/429/refusal/malformed/outage, email, map tile failure, and signed integrations.
- **Socket:** authentication, room isolation, ordered versions, cursor backfill, duplicate events, and multi-instance delivery.
- **UI:** component behavior, accessibility, responsive widths, Hindi/English, visual regression, offline drafts, and stale/retry states.
- **Security:** broken object authorization, role escalation, upload polyglots/decompression, prompt injection, token replay, spam, brigading, webhook replay, and export leakage.

### 12.2 Golden E2E scenarios

1. Authenticated citizen submits, tracks, confirms, and resolves a valid Report.
2. Anonymous citizen submits and uses a narrowly scoped tracking/decision token.
3. AI outage preserves the Report and later recovers through retry.
4. Invalid, irrelevant, sensitive, and suspicious evidence enters the correct safe path.
5. Duplicate auto-link, manual review, rejection, merge, and unmerge preserve every Report.
6. Cross-city, zone, ward, department, worker, and custom-role access is denied.
7. Field-worker offline retry cannot duplicate a resolution submission.
8. Failed verification returns work; citizen dispute reopens it.
9. SLA warning and escalation tiers execute exactly once.
10. In-app and email notifications reconcile without duplicates.
11. Socio opt-in publishes only approved redacted content; revocation leaves the civic record intact.
12. Abuse report, moderation, appeal, and suspension work end to end.
13. Audit tampering is detected.
14. Backup restore and provider-outage drills pass.

### 12.3 Definition of Done for every module

A module is `VERIFIED` only when:

- schema and safe migration/compatibility notes are complete;
- domain policies and backend object authorization are complete;
- retry, idempotency, audit, events, errors, and observability are complete where applicable;
- APIs are validated, typed, documented, paginated, and redacted;
- responsive UI covers loading, empty, error, retry, offline/stale, denied, and success states;
- unit, integration, contract, E2E, accessibility, and security tests applicable to the module pass;
- lint, strict typecheck, builds, migrations, and production configuration validation pass;
- project context, task status, acceptance matrix, API docs, and material ADRs are updated;
- no critical/high unresolved security or privacy finding remains;
- acceptance evidence is demonstrated before unrelated module work begins.

---

## 13. Delivery, Environments, and Rollout

### 13.1 Vertical-slice workflow

```text
Current truth and route contract
  -> additive schema and migration strategy
  -> domain policy and transaction
  -> audit/outbox/jobs
  -> typed API and authorization
  -> responsive accessible UI
  -> notification/realtime reconciliation
  -> tests, observability, documentation, acceptance
```

### 13.2 Environments

- **Local:** deterministic services, disposable database, versioned Indore fixtures, and fake external providers.
- **CI:** isolated PostgreSQL and provider/storage fakes; no production or paid secrets.
- **Staging:** production-like infrastructure, restricted synthetic/test data, migration rehearsal, full E2E, load, security, and observability validation.
- **Production:** least privilege, private storage, approved origins, backups/PITR, monitored workers, controlled migration, canary/rollback, and documented incident response.

### 13.3 Rollout sequence

1. Complete P0 correction and evidence.
2. Internal Indore dataset and employee-workflow test.
3. Controlled staff pilot.
4. Limited ward pilot with support and incident-response coverage.
5. City-wide pilot after privacy, accessibility, reliability, and operational ownership review.
6. Enable accountability and Socio only after their independent safety gates.
7. Enable approved government/channel integrations.
8. Expand through the M25 tenant control plane only after Indore acceptance evidence is stable.

High-risk capabilities use city-scoped feature flags with owner, expiry/review date, audit, and rollback path.

---

## 14. Locked Decisions and Assumptions

- Civique is an IMC-ready pilot until formal authority and integration are approved.
- Indore is the first city tenant; Madhya Pradesh is the containing state.
- PostgreSQL/Supabase, Prisma, Next.js, Express, TypeScript worker, FastAPI, private object storage, and Socket.IO remain the target stack unless superseded by an ADR.
- Durable PostgreSQL jobs/outbox remain the initial queue architecture.
- Public registration creates citizens only.
- The eight system roles are protected templates; authorized administrators may create bounded custom roles.
- Socio is explicit opt-in, alias-based, authenticated for interaction, and moderated.
- Social popularity never directly determines priority or SLA.
- Citizen non-response never permits AI-only or timeout-only closure.
- Hindi/English PWA, anonymous tracking, in-app notifications, and email are first-release channels.
- Existing routes and valid API behavior remain compatible during migration.
- Current uncommitted work is user-owned and must not be overwritten or deleted.
- Live provider calls, external messages, paid resources, deployment, push, production mutation, and destructive database operations require explicit permission.

---

## 15. Immediate Execution Gate

The current work remains **P0 — M1–M13 Production Acceptance Sweep**. The immediate sequence is:

1. accept this M0 governance reset and reconcile all companion documents;
2. inventory exact M1–M13 acceptance evidence and unresolved gaps;
3. complete M1 checks, then progress in module order;
4. finish the field-worker UI required by M10 without declaring unrelated modules complete;
5. demonstrate the pre-M14 golden flow through `RESOLUTION_SUBMITTED`;
6. begin M14 only after the P0 exit gate passes.

No later feature is considered implemented merely because it is described in this specification.
