# Project Context: Civique

This file is Civique's durable engineering memory. Product requirements and module definitions belong in [`../Implementation.md`](../Implementation.md); status evidence belongs in [`ACCEPTANCE_MATRIX.md`](ACCEPTANCE_MATRIX.md).

## Current Project Status

- **Phase:** P0 — Correct and Accept the Existing Foundation.
- **Current module:** M25 — Multi-City Control Plane.
- **Authoritative specification:** `Implementation.md`.
- **Current status authority:** `docs/ACCEPTANCE_MATRIX.md`.
- **Current implementation truth:** M0 is `VERIFIED`; substantial M1–M13 and UX implementation exists, but each feature module remains `PARTIAL` under the production Definition of Done.
- **Operating model:** Indore-first, IMC-ready pilot; not an official IMC service until formally authorized.

## Completed Modules

- M0 Product Governance is `VERIFIED`; the user accepted the reconciled specification and execution was authorized on 2026-09-20.

## In-Progress Work

- M20 civic asset registry implementation and acceptance.
- M19 civic health implementation and acceptance remains a carry-forward gate.
- M18 public accountability implementation and acceptance remains a carry-forward gate.
- M17 verifiable audit and transparency timeline remains a carry-forward gate.
- M16 resolution verification and citizen decision correction and acceptance remains a carry-forward gate.
- M15 priority engine remains a carry-forward acceptance gate.
- M14 duplicate intelligence remains a carry-forward acceptance gate.
- M13 AI intake intelligence remains a carry-forward acceptance gate.
- M12 notification delivery remains a carry-forward acceptance gate.
- M11 SLA and escalation remains a carry-forward acceptance gate.
- M9 department routing remains a carry-forward acceptance gate.
- M10 field-worker operations slice: mobile taskboard, guarded start action, SLA context, and resolution handoff at `/admin/worker`.
- M8 workforce administration and RBAC remains a carry-forward acceptance gate.
- M7 durable realtime event acceptance remains a carry-forward gate.
- M6 public map/privacy correction remains a carry-forward acceptance gate.
- M2/M3 database-backed acceptance remains a carry-forward gate until migrations `0018` and `0019` are applied.
- Preserve all existing uncommitted application work while the P0 acceptance sweep proceeds.
- Close the existing web lint backlog, then run deterministic CI and the remaining database drills.

## Pending Modules

- P0: M1–M13 correction and acceptance.
- P1: M14–M17 trust loop.
- P2: M18–M21 accountability and civic intelligence.
- P3: M22–M23 Civique Socio.
- P4: M24–M25 interoperability and multi-city expansion.

## Architecture Summary

- Next.js responsive PWA for public, citizen, field-worker, official, administrator, accountability, and future Socio experiences.
- Express TypeScript API for authentication, scoped authorization, validation, state transitions, routing, policies, signed media, and transactions.
- PostgreSQL/Supabase with Prisma as the system of record.
- Durable PostgreSQL jobs and transactional outbox with a TypeScript worker.
- FastAPI provider-neutral AI gateway with Groq Qwen 3.8 currently configured as a replaceable preview model.
- Private object storage for originals and normalized evidence; public clients receive only authorized redacted projections.
- Socket.IO provides low-latency hints backed by durable sequenced events and cursor reconciliation.
- Realtime sockets allow only validated, backend-authorized rooms; public clients reconcile event IDs and sequence gaps from the durable `/incidents/public/events` cursor API after reconnects.
- API readiness treats database, schema, queue, and required storage failures as blocking; worker and AI outages are degraded so durable Report intake remains available.
- Worker jobs use owner-bound leases, heartbeat renewal, bounded exponential retry, dead-letter state, and graceful drain.
- Official accounts can enroll encrypted TOTP secrets; login uses a five-minute signed MFA challenge before issuing normal sessions.
- Browser-cookie refresh/logout operations use a double-submit CSRF token; bearer-token API calls remain compatible.
- Security events are append-only application records with request, user-agent, and bounded IP context; secrets and tokens are never stored in event metadata.

## Technology Stack

- TypeScript, Python.
- Next.js 16, React 19, Tailwind CSS 4.
- Express, Prisma, PostgreSQL/Supabase.
- FastAPI, Groq provider adapter.
- Socket.IO and durable PostgreSQL worker/outbox.
- Leaflet for current map rendering.

## Database Decisions

- Report and Incident remain separate.
- Evidence originals are private, immutable by policy, content-hashed, and separated from normalized/redacted derivatives.
- Critical mutations write domain state, audit, outbox, and jobs atomically.
- Schema evolution is additive with expand/migrate/contract for destructive changes.
- Existing `User.role` remains a compatibility field until protected/custom role assignments and scope grants pass dual-policy parity.
- Indore is the first city tenant; city scope must be present in all tenant-sensitive records and queries.

## API Decisions

- Base path remains `/api/v1`.
- Public, owner, worker, official, administrator, and forensic DTOs are explicit and allow-listed.
- Retryable commands use idempotency keys; conflicting administration uses entity versions or ETags.
- Timeline/feed APIs use cursor pagination; admin directories may use bounded page pagination.
- Socket events never replace authoritative API reconciliation.

## Frontend Decisions

- Standardized on pure white (`#ffffff` / `bg-white`) universal background and Deep Forest Green (`#143527`) primary brand color across the entire platform.
- Clean neutral borders (`#eef1ea` / `border-slate-200`) and high-contrast typography replacing conflicting green tones and off-white/pale tints.
- Existing URLs remain compatible during migration.
- Citizen and field-worker experiences are mobile-first; official/admin experiences are desktop-efficient and responsive.
- Shared primitives live in `components/ui`; civic domain components live in feature/domain folders.
- No new page-local theme literals or mock controls presented as functional.
- The next bounded UI slice is the M10/UX8 field-worker mobile workflow.

## AI Decisions

- AI is advisory and cannot independently merge, prioritize, assign, or resolve.
- Groq `qwen/qwen3.8-27b` is configurable, preview, and replaceable through a model registry.
- The production FastAPI ML service uses Groq for vision analysis; the legacy ConvNeXt/PyTorch fallback is local-only and is excluded from Render production dependencies to stay within constrained memory limits.
- AI failure never blocks durable Report submission.
- Every analysis stores provider/model/prompt/schema/input provenance, status, latency, result, failure, and override outcome.
- “Authenticity” is expressed as manipulation-risk/evidence signals, never definitive truth or falsity.
- Public derivatives require privacy redaction independent of the classification result.

## Security Decisions

- Public registration creates only citizens; privileged accounts require invitation and scoped assignment.
- Authorization is backend-enforced and default-deny.
- Target access control uses protected role templates, custom roles, stable permissions, scoped assignments, and expiring delegations.
- Reserved permissions and separation of duties prevent self-elevation.
- Tokens are hashed, expiring, single-use where applicable; refresh replay revokes the token family.
- Public map, analytics, sockets, Socio, exports, logs, and AI prompts must not leak citizen identity or private evidence.

## Product Decisions

- First release: Hindi/English PWA, anonymous tracking, in-app notifications, and email.
- Socio is explicit opt-in, alias-based, authenticated for interaction, moderated, and separate from official records.
- Social popularity never directly changes priority or SLA; only verified corroboration may become a bounded policy input.
- Citizen non-response never permits AI-only or timeout-only closure; administrative closure requires verified evidence, authorized review, reminders, and appeal/reopen support.
- SMS, WhatsApp, IVR, kiosks, call-centre, and government integrations are later adapters requiring approval.

## Known Issues

- Most feature work is uncommitted; preserve the dirty worktree.
- Web lint currently reports 93 errors and 93 warnings; accessibility acceptance remains incomplete.
- The production webpack build passes through Next's in-process TypeScript compiler. Turbopack cannot bind its internal process port in the current sandbox.
- Local M1 migration, queue, readiness-outage, and restore checks pass; empty-database, hosted CI, and production-like restore/readiness evidence remain outstanding.
- M2 API/security integration and responsive official MFA/session screens are implemented; the policy matrix passes, but database-backed rerun and browser/hosted production evidence remain open.
- M3 now has checksum-verified, idempotent, city-scoped geography imports, dataset history, deterministic validation tests, and an official/admin Geography page. Database import, coordinate fixture, and cross-city denial acceptance are pending restored database access.
- M4 report intake now requires explicit consent in the citizen UI, uses a stable retry idempotency key, and sends canonical `lat`/`lng` geography resolution requests. Server-side hostile upload and private-storage safeguards remain enforced.
- M4 reporting now has restore-safe baseline taxonomy migration `0020_taxonomy_baseline`, supported-category bootstrap, and themed report/AI success-error toasts.
- M5 now provides an explicit idempotent lifecycle transition command backed by the guarded state machine, transactional audit log, and deterministic outbox idempotency key. Database-backed concurrency and cross-scope acceptance remain pending.
- M6 public map DTOs now generalize coordinates to an approximately 100m grid, omit internal priority scores, optionally return privacy-grid clusters, and provide an accessible list alternative.
- M8 People Directory now has scoped employee detail and audited suspension/reactivation; protected custom roles, permission assignments, delegations, and organization profiles remain pending.
- Official invitation links are enforced as one-minute, single-use tokens; successful activation redirects to the `/login` alias route.
- M8 now includes a compatibility namespaced permission catalog and default-deny guards for workforce read, invitation, and status operations; persistent custom-role assignments remain the next RBAC slice.
- M8 includes additive migration `0021_rbac_workforce` with persistent permission, role, assignment, scope, delegation, organization, and employment-profile tables. It must be applied to a disposable/approved database before custom-role APIs are exercised.
- M9 routing precedence is deterministic and explainable: ward rule, city rule, priority, effective date, then stable rule ID; cross-city department and ward assignments are denied.
- M11 uses timezone-aware working calendars and deterministic tier thresholds; SLA pauses require a reason and matching city/zone/department scope.
- M12 notifications use durable user-owned records, cursor pagination, unread totals, server-generated allow-listed deep links, idempotent outbox delivery, retryable worker attempts, and Socket.IO as a low-latency hint only. Email/SMS remain explicitly provider-dependent and cannot be represented as delivered until a provider reports success.
- M13 AI intake uses a versioned advisory-only policy (`m13-v2`), exposes active provider/model status, returns bounded adaptive questions from visual signals, and preserves null confidence plus human review when AI is unavailable or uncertain. Citizen answers remain editable and are included in the citizen-confirmed description; AI cannot independently resolve or finalize a report.
- M14 duplicate intelligence keeps Reports separate from Incidents. Candidate scores combine bounded spatial/category/temporal signals and optional visual/hash signals; automatic linking is explainable and candidate review is backend-scoped. LINK moves only the Report association and preserves the original decision/audit record; NOT_DUPLICATE rejects the candidate without deleting civic history.
- M15 priority is calculated by versioned deterministic policy `m15-v1`; every score returns signal points and explanations. AI confidence and corroboration are bounded inputs, ordinary popularity is excluded, and authorized temporary overrides require a reason, expiry, and audit event.
- M16 resolution verification combines deterministic GPS/provenance rules with advisory before/after AI output. Officials can approve/reject evidence with an audit reason from the incident workbench, citizen confirmation/dispute remains explicit, administrative closure requires verified evidence and an expired confirmation window, and citizens can appeal a resolved Incident within seven days. A rollback-isolated database acceptance harness covers the full trust loop once migration 0024 is applied.
- P0 role/scope and cross-resource E2E coverage is incomplete.
- Field-worker mobile/offline flow is incomplete.
- SLA scheduling still needs durable queue acceptance and multi-worker integration coverage.
- Email delivery needs approved provider/retry/bounce validation; SMS is not configured.
- Groq needs startup canary, labelled evaluation, and privacy-redaction acceptance; the API now exposes the configured provider/model/schema as advisory metadata.
- Duplicate intelligence, deterministic priority, complete resolution verification, tamper-evident audit, reproducible public analytics, civic health, assets, predictions, Socio, external integrations, and multi-city control remain incomplete.
- M14 migration `0022_duplicate_intelligence` is additive and must be applied before candidate review endpoints are exercised; visual embeddings are intentionally not enabled until a labelled evaluation set is approved.
- M15 migration `0023_priority_engine` is additive and must be applied before priority explanation/override endpoints are exercised.
- M16 migration `0024_resolution_appeals` is additive and must be applied before citizen appeal endpoints are exercised.
- M17 migration `0025_verifiable_audit` adds per-incident chain ordering, hash versions, and durable chain-head anchors. New audit writes use canonical `m17-v1` hashes under a transaction-scoped advisory lock; legacy rows remain verifiable as historical records.
- M18 migration `0026_accountability_metrics` adds versioned metric definitions and daily snapshot storage. Public scorecards use `m18-v1`, minimum cohort suppression, bounded windows, and no identity/coordinate exposure.
- M19 migration `0027_civic_health` adds city-scoped health policies and ward snapshots, provisions the default `m19-v1` policy for existing cities, and uses idempotent ward/date/policy upserts. The score is explainable, suppresses cohorts below five, and reports confidence/completeness rather than false precision.
- M20 migration `0028_civic_assets` adds city-scoped civic assets, import runs, active Incident links, and maintenance events. Imports are checksum-idempotent, preview-first, and rollback only assets created by that run without silently replacing unrelated assets.
- M21 migration `0029_predictive_intelligence` stores versioned forecast runs/cells, held-out baseline evaluations, operator feedback, attempts, leases, and drift status. `m21-baseline-v1` is advisory-only, suppresses sparse groups, includes asset-linked signals, and uses privacy-safe ward/category counts with bounded horizons and uncertainty intervals.
- M22 migration `0030_socio_publishing` stores explicit citizen publication consent and consent history, public aliases, redacted Incident-linked posts, follow scopes, saves, and official public status-update history. `/preview` is non-persisting; production is fail-closed unless `CIVIQUE_SOCIO_ENABLED=true`. Revocation removes only the public projection; the official Report, Incident, evidence, and audit history remain unchanged.
- M23 migration `0031_socio_trust` adds one-per-user support reactions, structured pending corroboration with scoped review, shallow comments/revisions, duplicate-safe content reports, moderation cases/actions/appeals with restore, bounded reputation context, and user block/mute controls. Moderation can remove or lock the public projection but never deletes the official Report, Incident, evidence, or audit history.
- M24 migration `0032_government_integrations` adds city-scoped adapter records, signed inbox events with monotonic sequence checks, unique external references, idempotent delivery records/retries, receipts, and conflict records. HMAC webhooks require a timestamp, five-minute replay window, unique event ID, provider secret, and reject older sequences. Integrations fail closed unless `CIVIQUE_INTEGRATIONS_ENABLED=true`; activation additionally requires `CIVIQUE_INTEGRATION_APPROVAL_TOKEN`, and no government adapter is enabled or claimed by default.
- M25 migration `0033_multi_city_control_plane` adds tenant settings with an existing-city backfill, city branding/locale/timezone/data-residency metadata, default pilot feature flags, versioned policy activation, lifecycle events, and provisioning history. Super administrators provision, mutate, activate, and deactivate tenants; city administrators can inspect only their assigned city. Public tenant configuration exposes only allow-listed fields and flags.
- Whole-platform verification on 2026-09-21: API/web/worker typechecks, API/worker unit suites, API/worker builds, web webpack build, M24 security tests, and M25 tenant policy tests pass. Database-backed integration suites are blocked by Supabase pooler `P1001`; web lint remains an existing 168-error/104-warning backlog.
- Web error presentation hardening: `apps/web/lib/api/client.ts` now converts Prisma, database, network, stack, and oversized server messages into short status-aware user messages; technical details remain server-side. Global Civique toasts are width-capped for mobile readability.
- M13 civic relevance hardening: Groq now returns separate authenticity, civic relevance, and `ACCEPT`/`REJECT`/`REVIEW_REQUIRED` decision fields. Authentic but irrelevant images are rejected as non-civic evidence; image-specific follow-up questions are accepted only for accepted or review-required evidence. The citizen modal and submission guard block rejected evidence, and the worker records the rejection without rejecting an existing Incident that received an unrelated corroborating Report.
- M13 question-first intake: accepted/review-required draft analysis now opens a dedicated citizen question dialog before insights. Questions are image-specific and normalized to exactly three choices; the selected answers are sent in a second Groq pass, which produces the detailed AI insights shown in the review modal. The insights modal no longer renders the question form.
- The M13 question dialog now presents one question per screen with preserved answers, progress segments, Back/Continue controls, three choice cards, and Civique dark-green/lime visual treatment.
- If the second answer-aware Groq request times out, is unavailable, or returns an unusable result, the citizen flow preserves the first civic-relevance analysis and citizen answers for review instead of showing the generic “Manual Entry Required” state.

## Known Bugs

- Track concrete reproducible bugs in the active module section of `docs/TASK_STATUS.md`; do not treat missing planned features as bugs.

## Temporary Workarounds

- Legacy `User.role` authorization remains during the future additive RBAC migration.
- Legacy page-level styling remains only where a route has not completed its functionality-preservation migration.
- External channels may remain `PENDING_CONFIGURATION`; they must never claim successful delivery.
- Next uses its supported in-process TypeScript compiler API for production builds because CLI `--showConfig` capture is empty in the current sandbox runtime.
- Prisma Client must be regenerated from `services/api/prisma/schema.prisma` after schema changes; in the current sandbox this requires running Prisma generation from `services/api` with approved process permissions.

## Environment Requirements

- Node.js 22+ and npm workspaces.
- Python 3.14+ for the current ML service environment.
- PostgreSQL/Supabase with separate runtime and migration URLs.
- Private object-storage credentials for evidence flows.
- Provider credentials only for explicitly approved live canaries.

## Important Commands

```text
npm test
npm run typecheck
npm run lint
npm run build:web
npm run build:api
npm run build:worker
npm run health:check
npm run verify:m1
npm run verify:overall
```

Database integration and live-provider commands must target disposable/non-production resources and follow the module's approval requirements.

## Architectural Decisions

- npm workspaces for the monorepo.
- PostgreSQL/Supabase and Prisma as the authoritative store.
- Durable PostgreSQL jobs and transactional outbox.
- Incremental Dark Green Pro component migration.
- Provider-neutral AI boundary with configurable Groq vision model.
- Hashed auth action tokens and post-persistence classification.
- Durable sequenced real-time events.
- Preference-aware durable notification delivery.
- `Implementation.md` as sole master specification with protected/custom RBAC and opt-in Socio target architecture.
- Blocking-versus-degraded readiness and owner-bound renewable worker leases for M1 resilience.
- Encrypted official TOTP, double-submit CSRF for cookie mutations, and durable authentication security events for M2.

See [`DECISIONS.md`](DECISIONS.md) for reasons and consequences.

## Next Recommended Task

Report submission P2028 hardening: duplicate detection now uses a bounded geographic pre-filter, report persistence allows a cold database connection up to 45 seconds, and transaction timeout failures return a retry-safe sanitized response. API typecheck/build and duplicate helper tests pass. Re-run a real citizen submission with the same `Idempotency-Key` after restarting the API; database-backed verification still requires the restored Supabase connection.

The citizen report wizard now redirects successful submissions directly to `/report/:reportId` using the returned durable report ID, with a single success toast. Web typecheck passes.

Field-worker resolution evidence submission was hardened after slow restored-database requests caused Prisma interactive transactions to expire. Original and normalized evidence uploads now run in parallel, successful partial uploads are tracked for cleanup, the resolution transaction no longer loads unrelated ward/report relations, and the transaction has explicit 10-second acquisition/45-second execution budgets. Prisma P2028/transaction-expiry failures return a concise retry-safe 503 response instead of provider details. API typecheck passes; re-run the field-worker resolution flow against the restored Supabase environment.

Fixed the shared Dialog focus trap so inline callback recreation cannot restore focus away from controlled inputs during typing. Web typecheck passes.

Lifecycle notifications now include `REPORT_RECEIVED` for the Incident triage owner, so Ward Officers receive new corroborating/duplicate report receipts even when no new `WARD_OWNER_ASSIGNED` event is emitted. Worker typecheck and tests pass.

Invitation form errors now use a dialog-local alert instead of the People Directory page-level alert, keeping validation and API errors above the modal content. Web typecheck passes.

Report intake performance hardening: original and normalized evidence uploads now run in parallel, report persistence avoids a redundant submission-status update, and routing decisions reuse the already-resolved routing result. API typecheck/build pass. The attached trace still indicates high baseline Supabase/Postgres round-trip latency, so database placement/pooler configuration remains an environment-level optimization.

Notification links use an Incident ID. Report detail and timeline APIs now resolve both Report IDs and scoped Incident IDs, fixing Ward Officer notification navigation without weakening citizen ownership or official scope checks. API typecheck passes.

Incident workbench assignment controls now follow the lifecycle state machine: field-worker assignment is disabled during `AI_REVIEW` with an explicit classification-first explanation, and the acknowledge action is shown only for `OPEN` incidents. Web typecheck passes.

The Incident workbench now exposes a prominent `Review AI & Open` action during `AI_REVIEW`. Ward Officers can confirm/override the category immediately through the audited classification endpoint; they are not required to wait for the AI worker. Web typecheck passes.

Incident workbench actions are now role-scoped in the UI: only operational officials see acknowledge/classification/routing/assignment/verification controls, while only the assigned Field Worker sees Start Repair and Submit Repair Proof. Backend authorization remains authoritative.

Field-worker start transitions now use an explicit Prisma transaction budget and avoid loading unrelated ward/report relations during the write. P2028 expiry is mapped to a retry-safe 503 message. API typecheck/build pass.

Report Form, AI Insights Modal & Platform Loading Screen redesign: replaced the basic pulse placeholder with a concentric orbital-ring scanner and status ticker in `LoadingState.tsx`. Restructured `AiAnalysisModal.tsx` from a cramped 3-column squeeze into an airy, balanced 2-panel inspection cockpit with laser scanning animation, forensic authenticity breakdown, and high-contrast editable inputs. Rebuilt `report/page.tsx` as a full-width (`max-w-[1720px]`) bespoke Incident Intake Studio, eliminating blank side margins with a layered `bg-slate-50/70` canvas, official municipal department tiles, quick-fill civic template chips, an interactive 4-tier urgency matrix, Indore ward geofencing, and a live readiness & AI telemetry rail. Monorepo typecheck and Next.js webpack production build pass.

Civique Login Page Redesign: completely redesigned `/signin` and `/login` to match the Dribbble architectural reference with a warm linen canvas (`#f2f4ec`), rounded card shell, role switcher (`🔘 As a Citizen` | `⚪ As an Official`), rounded pill social/form inputs, orange quotation testimonial, and a bespoke SVG architectural building skyline with dashed window columns and geometric trees in Civique's palette. Monorepo typecheck and web build pass.

Finish M25 acceptance with migration `0033_multi_city_control_plane`, full cross-city isolation suites, and browser scope evidence. Carry forward M1–M24 gates; do not enable multi-city operations until every tenant-sensitive surface passes isolation review.
