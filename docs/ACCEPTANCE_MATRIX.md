# Civique Production Acceptance Matrix

**Authority:** Status and evidence registry for modules defined in [`../Implementation.md`](../Implementation.md)

**Last reviewed:** 2026-09-20
**Active release:** P0 — Correct and Accept the Existing Foundation

## Status Rules

- `NOT_STARTED`: no meaningful implementation exists.
- `PARTIAL`: implementation exists, but at least one production gate is missing.
- `BLOCKED`: an external dependency or approval prevents acceptance; the blocker must be recorded.
- `VERIFIED`: every applicable Definition of Done gate in `Implementation.md` has passing evidence.

A UI rendering, migration file, route, unit test, or historical completion note is not enough by itself to mark a module `VERIFIED`.

## Current Matrix

| Module | Status | Current evidence | Required before VERIFIED |
| --- | --- | --- | --- |
| M0 Product Governance | VERIFIED | Master specification rebuilt; companions reconciled; link/terminology/whitespace checks passed; user accepted the reset on 2026-09-20 | Re-open only if product authority or governance changes |
| M1 Infrastructure | PARTIAL | `npm test`, workspace typechecks, API/worker/web builds, local 19-migration upgrade, queue lease/retry/restart integration, live readiness outage probes, and restore into `civique_restore_m1_20260920` passed; runbook and CI workflow added | Fix 93 web lint errors, run hosted deterministic CI, exercise an empty database, and complete an approved production-like restore/readiness drill |
| M2 Identity and Sessions | PARTIAL | Hashed recovery/invitation tokens, citizen-only registration, refresh replay defense, cookie CSRF on mutating browser endpoints, official TOTP enrollment/challenge/verification, responsive sign-in/profile MFA and session UI, session revocation endpoint, security-event migration, policy matrix tests, and previously passing local HTTP integration | Current database-backed acceptance rerun is blocked by the stopped disposable PostgreSQL service; dedicated browser accessibility/security E2E, hosted CI evidence, and production-like provider checks remain |
| M3 Geography and Jurisdiction | PARTIAL | State/city/zone/ward models, versioned geography metadata, deterministic geometry/checksum validation, idempotent city-scoped import API, dataset history API, and responsive admin Geography page | Apply migration `0019_geography_imports`, approved boundary fixture resolution, import idempotency/checksum conflict tests, unsupported-area results, cross-city denial, accessibility, and hosted CI evidence |
| M4 Secure Citizen Reporting | PARTIAL | Authenticated report wizard, explicit evidence/privacy consent UI, stable retry idempotency key, restore-safe taxonomy baseline/bootstrap, private originals/normalized derivatives, upload validation, canonical geography resolution, AI-failure-safe draft flow, and themed toast feedback | Apply migrations `0018`–`0020`, restored-database/storage E2E, hostile-file fixtures, out-of-service fixtures, Hindi/English, offline/low-bandwidth flow, anonymous tracking, public redaction, accessibility, and browser E2E |
| M5 Report and Incident Engine | PARTIAL | Report/Incident separation, idempotency, explicit guarded transition command, deterministic outbox replay keys, rollback-isolated transition/duplicate/scope integration suite, timeline/audit/outbox writes, and lifecycle UI integration | Execute the rollback-isolated suite against an explicitly approved disposable database; complete rejection/review and full golden-flow evidence |
| M6 Public Map | PARTIAL | Privacy-grid public DTOs, removal of internal priority score, opt-in privacy-grid clusters, bbox validation, redacted public detail, responsive map UI, and accessible list alternative | Restored-database HTTP redaction, private media/identity leakage tests, cluster behavior, responsive accessibility, and browser evidence |
| M7 Real-Time Events | PARTIAL | Authenticated/authorized rooms, strict cursors, sequenced durable events, event-id dedupe, gap backfill, reconnect map reconciliation | Disposable-database Socket.IO room denial, reconnect, multi-instance delivery, and retention/order tests |
| M8 Administration and Workforce | PARTIAL | Scoped People directory/detail, workload/security summaries, invitations, audited suspension/reactivation | Protected custom RBAC, permission/scope grants, employee profiles, delegation, organization hierarchy, and full denial matrix |
| M9 Department Routing | PARTIAL | Category/rule/decision models, preview and rule APIs, assignment validation | Full routing matrix, rollback/activation, cross-scope E2E and admin configuration UI |
| M10 Field Operations | PARTIAL | Work orders, assignments, start/resolve commands, evidence provenance | Worker-first UI, offline retry, stale/wrong-worker/GPS/time concurrency tests |
| M11 SLA and Escalation | PARTIAL | SLA policy/state/events, calendars, pause/resume, evaluator | Durable queue scheduling, reassignment and multi-worker idempotency integration |
| M12 Notifications | PARTIAL | Typed notification policy/deep links, cursor pagination/unread count, user-owned read APIs, durable delivery attempts, duplicate-safe realtime bell, responsive preferences UI, policy and worker contract tests | Restored-database HTTP ownership/pagination tests, approved email canary, retry/bounce/suppression integration, Socket.IO reconnect browser evidence, and recipient lifecycle E2E |
| M13 AI Intake Intelligence | PARTIAL | Versioned advisory model policy/status and canary endpoint, structured M13-v2 result, provenance metadata, bounded adaptive questions, durable classification, human-review fallback, deterministic labelled evaluation fixtures, EXIF-stripping derivative tests, sensitive-signal redaction policy, and Groq provider contract matrix | Approved live model canary, labelled Indore image evaluation, restored-database retry/review/override persistence tests, and browser evidence |
| M14 Duplicate Intelligence | PARTIAL | Explainable distance/category/time/visual/hash scoring, additive candidate/decision migration, scoped candidate and decision APIs, reversible Report linking, audit reasons, and scoring tests | Apply migration `0022`, restored-database concurrency/count/scope tests, review UI evidence, and approved visual-embedding quality evaluation |
| M15 Priority Engine | PARTIAL | Versioned deterministic policy, explainable signal breakdown, priority explanation endpoint, scoped expiring override/revoke APIs, additive migration, admin policy workbench, and deterministic tests | Apply migration `0023`, restored-database concurrency/scope/expiry/audit tests, and browser evidence |
| M16 Resolution Verification | PARTIAL | Deterministic verification policy, worker AI verification, scoped official review APIs, official workbench review controls, deadline-aware administrative closure, seven-day appeal/reopen API, citizen decision and appeal UI, rollback-isolated DB harness | Apply migration `0024`, run `test:integration:m16` against restored DB, approved before/after fixtures, and browser accessibility evidence |
| M17 Verifiable Audit | PARTIAL | Versioned canonical audit hash chain, durable chain-head anchors, transaction-scoped serialized append, scoped integrity verifier/export API, admin verification controls, citizen-safe timeline projection | Apply migration `0025`, restored-database mutation/deletion/insertion/reorder/concurrency tests, and browser accessibility evidence |
| M18 Public Accountability | PARTIAL | Versioned metric definitions, privacy-suppressed public scorecard API/UI, category/ward/department comparisons, SLA/resolution metrics, methodology metadata, CSV export, deterministic policy tests | Apply migration `0026`, restored-database reproducibility/late-event/tenant tests, and browser accessibility/bilingual evidence |
| M19 Civic Health | PARTIAL | Versioned `m19-v1` ward health policy, default policy provisioning, transparent component scoring, sparse-cohort suppression, confidence/completeness, public ward/detail/history/methodology APIs, official preview/policy activation/snapshot rebuild APIs, responsive public scorecard | Apply migration `0027`, restored-database snapshot/reproducibility/scope tests, policy activation/nightly idempotency, and browser accessibility evidence |
| M20 Civic Asset Registry | PARTIAL | Versioned asset types/assets, checksum/idempotent import preview/apply/rollback, public-safe asset DTOs, scoped incident links, maintenance history, responsive admin directory/detail/import UI | Apply migration `0028`, restored-database import/rollback/conflict/scope tests, QR/map evidence, and browser accessibility evidence |
| M21 Predictive Intelligence | PARTIAL | Versioned advisory forecast runs/cells, sparse-cohort suppression, asset-linked features, 28-day baseline, bounded horizon, confidence intervals, held-out baseline metrics, attempts/leases/retry, scoped APIs, operator feedback, admin predictions UI, migration | Apply migration `0029`, restored-database leasing/retry/evaluation/drift/scope tests, and browser evidence |
| M22 Socio Publishing and Feed | PARTIAL | Explicit owned-report consent and history, alias-based redacted projections, generalized locations, preview, incident-linked cursor feed, follows/saves, revocation, official status updates, feature gate, citizen/public UI, migration, privacy/type tests | Apply migration `0030`, restored-database consent/redaction/pagination/media tests, moderation-readiness review, and browser evidence |
| M23 Engagement and Moderation | PARTIAL | Support reactions, scoped corroboration verification, shallow threaded comments with revisions, rate limits, duplicate-safe reports, moderation cases/actions, appeal review/restore, blocks/mutes, reputation context, community rules, and engagement/moderation UI | Apply migration `0031`, run restored-database abuse/brigading/appeal/suspension/record-preservation tests, moderation review, and browser evidence |
| M24 Government and Channel Integrations | PARTIAL | Signed HMAC webhooks, timestamp replay protection, monotonic sequence rejection, unique inbox events, payload hashes, external-reference mapping, delivery receipts/retries, idempotent deliveries, conflict resolution, approval-token activation control, fail-closed gate, and admin UI | Apply migration `0032`, run fake-provider signature/order/outage/conflict/redaction/retry tests, and obtain formal authority approval before live activation |
| M25 Multi-City Control Plane | PARTIAL | Tenant provisioning/backfill, city lifecycle, settings/branding/residency metadata, server-side feature flags, versioned policy activation, public tenant DTO, scoped admin APIs, responsive control-plane UI, and isolation policy tests | Apply migration `0033`, run full cross-city isolation suites across every storage/API/worker/public surface, and capture browser scope evidence |
| M24 Government and Channel Integrations | NOT_STARTED | Adapter architecture only | Formal authority/provider approval and full module Definition of Done |
| M25 Multi-City Control Plane | NOT_STARTED | Tenant-ready intent only | Full isolation suite and module Definition of Done |

## P0 Exit Evidence

- [ ] Root lint, strict typecheck, test, and production builds pass deterministically.
- [ ] Fresh and supported-upgrade migrations pass against an isolated production-like database.
- [ ] No critical/high auth, object-scope, upload, privacy, state-machine, or secret-management issue remains.
- [ ] Authenticated and anonymous pre-M14 golden flows reach `RESOLUTION_SUBMITTED`.
- [ ] AI outage does not prevent durable Report submission.
- [ ] Public DTOs, sockets, maps, and signed media pass privacy regression tests.
- [ ] Browser reconnect/backfill and multi-instance real-time behavior pass.
- [ ] Field-worker mobile workflow and offline retry pass.
- [ ] SLA scheduling and notification retry/idempotency integration pass.
- [ ] Hindi/English, WCAG 2.2 AA/GIGW-oriented, responsive, and visual checks pass for P0 routes.
- [ ] External provider canaries are either approved and passing or explicitly recorded as blockers.

## Evidence Update Rule

When a gate passes, add the exact test, command, artifact, migration rehearsal, screenshot set, or runbook reference to this file. Do not replace evidence with a narrative claim. Update `docs/TASK_STATUS.md` and `docs/PROJECT_CONTEXT.md` in the same change.
