# Civique Task Status

## Current Module

M25 — Multi-City Control Plane

## Status

IMPLEMENTED — tenant control plane and isolation contracts are complete; restored-database tenant-isolation and browser evidence remain acceptance gates.

## Report Submission Reliability Fix (2026-09-21)

- [x] Bound duplicate-incident lookup to a 100m geographic window and 250 candidates to prevent transaction expiry as incident volume grows.
- [x] Increased the report persistence transaction budget for cold restored-database connections and added retry-safe `P2028` handling.
- [x] API typecheck/build and duplicate helper tests pass.
- [ ] Verify a live submission against the restored Supabase database after restarting API/worker; use the same `Idempotency-Key` for retries.
- [x] Redirect successful citizen submissions to the report detail/timeline page with one success toast.
- [x] Fixed invitation Dialog focus loss while typing controlled email fields.
- [x] Routed `REPORT_RECEIVED` lifecycle notifications to the current Incident triage owner as well as the submitting citizen.
- [x] Rendered invitation errors inside the modal rather than behind the dialog overlay.
- [x] Optimized report intake with parallel evidence uploads, reused routing decisions, and one fewer database write.
- [x] Fixed notification links opening an Incident ID on the report detail/timeline route.
- [x] Aligned field-worker assignment and acknowledge controls with valid incident lifecycle states.
- [x] Added immediate Ward Officer `Review AI & Open` action during AI processing.
- [x] Scoped Incident workbench controls by role so Ward Officers do not see Field Worker actions.
- [x] Hardened Field Worker start-work transaction against restored-database P2028 expiry.

## Report Form, AI Insights Modal & Loading Screen Redesign (2026-09-23)

- [x] Redesigned `LoadingState.tsx` with concentric rotating orbital rings, subtle emerald glow, tech glyph center, and dynamic status cycler.
- [x] Redesigned `AiAnalysisModal.tsx` into a spacious, balanced 2-panel inspection cockpit with laser scanning animation, forensic authenticity breakdown, and high-contrast editable fields.
- [x] Rebuilt `report/page.tsx` from scratch as a full-width (`max-w-[1720px]`) bespoke Incident Intake Studio:
  - Eliminated empty left/right blank gutters with fluid layout and layered `bg-slate-50/70` canvas with elevated studio cards.
  - Added official municipal department badges across 7 categories with tailored iconography.
  - Added smart civic template chips (`+ Deep road pothole`, `+ Water pipeline burst`, etc.) for one-tap standard phrasing.
  - Added an interactive 4-tier urgency & risk matrix with concrete SLA dispatch targets.
  - Added an intuitive landmark / location hub with Indore geofence verification and collapsible technical GPS drawer.
  - Added a live Intake Readiness Monitor and Groq AI telemetry rail.
- [x] Added `@keyframes laserSweep` and `@keyframes civique-shimmer` to `apps/web/app/globals.css`.
- [x] Verified full monorepo typecheck (`npm run typecheck`) and web production webpack build (`npm run build:web`).

## Civique Login Page Redesign & Refinements (2026-09-23)

- [x] Converted the login page to an edge-to-edge full-bleed pure white (`bg-white`) layout, removing the floating center card container.
- [x] Transformed the right-hand section into a pure, inspiring civic quote about Civique's municipal intelligence and public accountability, removing the person/avatar card and styling with prominent orange quotation marks.
- [x] Swapped out the previous house icon and secondary text for a sleek, techno-styled `Civique` logo in the `Orbitron` typeface at top-left.
- [x] Removed the "Sign in with Apple" button and repositioned "Sign in with Google" after the input fields and submit button with an "OR" divider.
- [x] Eliminated vertical scrolling on desktop viewports (`h-screen overflow-hidden` with zero-scrollbar left column and constrained architectural skyline illustration).
- [x] Preserved official TOTP 6-digit MFA challenge, role redirection, and quick demo credentials.
- [x] Verified full monorepo typecheck (`npm run typecheck`) and Next.js webpack production build (`npm run build:web`).

## Platform-Wide Retheming: Pure White Canvas & Forest Green (#143527) (2026-09-23)

- [x] Adopted unified pure white (`#ffffff` / `bg-white`) universal background across the entire platform, eliminating all off-white/pale tints (`#fbfcf8`, `#f7faf5`, `#f6faf3`).
- [x] Standardized Deep Forest Green (`#143527`) as the universal primary brand color, replacing legacy greens (`#16a34a`, `#15803d`, `#166534`, `#1b4332`, emerald tones, and `#aff33e`).
- [x] Replaced all instances of `#aff33e` across the entire codebase (0 occurrences verified).
- [x] Updated global CSS variables, tokens, and root layouts (`globals.css`, `layout.tsx`).
- [x] Rethemed all shared navigation, headers, footers, sidebars, and logo components (`CiviqueLogo.tsx`, `CitizenHeader.tsx`, `Sidebar.tsx`, `TopBar.tsx`, `MobileNavigation.tsx`).
- [x] Rethemed all auth flows (`signin`, `signup`, `forgot-password`, `reset-password`, `accept-invitation`).
- [x] Rethemed all citizen and public screens (Landing, Report Intake studio, AI insights modal, Case details, Public map, Socio feed, Public accountability, Profile, Civic Health).
- [x] Rethemed all admin operational cockpits (Admin dashboard, Incidents, Reports, Moderation, Priority engine, Assets, Predictions, Worker taskboard, People/Workforce, Analytics, Integrations, Geography, Tenants, Duplicates, Roles).
- [x] Rethemed the shared Design System showroom (`/design-system`).
- [x] Zero TypeScript compilation errors verified with `npx tsc --noEmit -p apps/web/tsconfig.json`.

## M13 Civic Evidence Relevance Guard (2026-09-23)

- [x] Separated image authenticity from civic relevance and final intake decision in the Groq vision contract.
- [x] Rejected authentic but irrelevant images such as logos, advertisements, documents, screenshots, products and unrelated graphics.
- [x] Added Groq-generated image-specific follow-up questions for accepted or review-required evidence; rejected evidence returns no questions.
- [x] Blocked the citizen modal and final report submission from applying or submitting rejected evidence.
- [x] Persisted the decision, civic relevance, follow-up questions and rejection status in AI provenance; existing Incidents are protected from rejection by an unrelated corroborating image.
- [x] Python provider contract, API tests, API/worker/web typechecks pass.
- [x] Moved image-specific follow-up questions into a separate pre-insight dialog with exactly three selectable options per question.
- [x] Added a second answer-aware Groq analysis pass so detailed insights are generated only after the citizen answers the questions.
- [x] Converted the follow-up dialog into a one-question-at-a-time guided flow with Back/Continue navigation, progress indicators, three answer cards, and Civique Dark Green Pro styling.
- [x] Preserved the successful first-pass civic analysis when the answer-aware second Groq pass is unavailable or returns no usable category; the UI now shows a reviewable fallback instead of incorrectly implying the genuine image was invalid.

## M25 Implemented

- [x] Added migration `0033_multi_city_control_plane` for tenant settings, city feature flags, versioned policy activation, and provisioning history.
- [x] Added super-admin tenant provisioning/settings APIs and city-admin read-only scoped access.
- [x] Added server-side city feature flags, data-residency/locale/timezone/branding metadata, and versioned policy APIs.
- [x] Added public slug-based tenant configuration DTO with allow-listed public flags.
- [x] Added responsive City Control Plane admin UI and tenant isolation policy tests.
- [x] Added migration backfill for existing cities, default pilot feature flags, scoped policy reads, and explicit activate/deactivate lifecycle events.

## M25 Verification Evidence

- [x] API/web typechecks pass.
- [x] Tenant slug, rollout, and isolation policy tests pass.
- [x] API/web typechecks pass after M25 lifecycle and migration-backfill hardening.
- [ ] Apply migration `0033_multi_city_control_plane` to an approved disposable database.
- [ ] Run cross-city database/API/socket/job/storage/export/analytics/Socio/integration isolation suites.
- [ ] Capture browser evidence for super-admin and city-admin scope behavior.
- [!] Full database-backed integration execution is currently blocked by Supabase pooler reachability (`P1001` on `aws-0-ap-northeast-1.pooler.supabase.com:6543`).
- [!] Web lint remains a repository-wide backlog (currently 168 errors/104 warnings); production webpack build and TypeScript checks pass.

## M24 Implemented

- [x] Added migration `0032_government_integrations` for adapters, signed inbox events, external references, delivery receipts, and conflict-ready reconciliation records.
- [x] Added timestamped HMAC webhook verification with five-minute replay protection, unique event IDs, payload hashes, and duplicate-safe processing.
- [x] Added scoped adapter configuration, external-reference mapping, delivery receipt, and operator directory APIs.
- [x] Added fail-closed `CIVIQUE_INTEGRATIONS_ENABLED` gate; no IMC/311/e-Nagar Palika adapter is claimed or enabled by default.
- [x] Added responsive admin Integrations control-plane UI and provider-neutral signature tests.
- [x] Added monotonic sequence rejection for signed inbound events, delivery retry scheduling, inbox/delivery/conflict operator APIs, and explicit approval-token activation control.

## M24 Verification Evidence

- [x] API/web typechecks pass.
- [x] HMAC signature, timing-safe comparison, and replay-window tests pass.
- [x] API/web typechecks pass after retry, ordering, and conflict-control hardening.
- [ ] Apply migration `0032_government_integrations` to an approved disposable database.
- [ ] Run signed webhook ordering/replay, outage, conflict, redaction, and delivery-retry integration tests with fake providers.
- [ ] Obtain formal authority/provider approval before enabling any live adapter.

## M23 Implemented

- [x] Added migration `0031_socio_trust` for support reactions, structured corroboration, shallow comments/revisions, reports, moderation cases/actions/appeals, and block/mute controls.
- [x] Added authenticated citizen engagement APIs with one-reaction constraints, self-corroboration prevention, comment length/thread limits, rate limits, and alias-only identity.
- [x] Added moderation queue/actions with reason capture, visibility removal, comment locking, appeals, and preservation of the official Report/Incident record.
- [x] Added bounded civic reputation context and moderator suspension action; neither changes municipal priority or SLA.
- [x] Added scoped corroboration verification/rejection, appeal review/restore, duplicate open-report protection, and moderation dashboard queues for both workflows.
- [x] Added public post engagement counts, official updates, community rules, reporting, support, corroboration, and discussion UI.

## M23 Verification Evidence

- [x] API/web typechecks pass.
- [x] Existing Socio privacy policy tests pass.
- [x] API/web typechecks pass after the M23 completion pass.
- [ ] Apply migration `0031_socio_trust` to an approved disposable database.
- [ ] Run abuse, brigading, scope, appeal, suspension, and record-preservation integration tests.
- [ ] Complete moderation-readiness and browser accessibility review.
- [!] Integration harness currently blocked by database reachability (`P1001` to the configured Supabase pooler); no production data was modified.

## M22 Implemented

- [x] Added migration `0030_socio_publishing` for aliases, posts, follows, and saves.
- [x] Added versioned publication-consent history, official status-update history, and a production feature gate.
- [x] Added non-persisting publication preview with explicit redaction/privacy disclosures.
- [x] Added explicit consent publication API scoped to the citizen's owned Report.
- [x] Added redacted text, generalized coordinates, public aliases, incident-linked posts, and revocation projection.
- [x] Added cursor-paginated locality/category/status feed and shareable post detail API.
- [x] Added follow and save APIs without engagement-to-priority coupling.
- [x] Added citizen report opt-in UI and responsive `/socio`/`/socio/:postId` pages.
- [x] Added redaction/coordinate privacy tests and rollback-isolated publication test.

## M22 Verification Evidence

- [x] API/web typechecks pass.
- [x] Socio privacy tests pass.
- [x] API and web typechecks pass after M22 hardening.
- [ ] Apply migration `0030_socio_publishing` to an approved disposable database.
- [ ] Run restored-database consent/revocation, DTO redaction, cursor pagination, ownership, and media privacy tests.
- [ ] Complete independent moderation-readiness and browser accessibility review before enabling publicly.

## M21 Implemented

- [x] Added migration `0029_predictive_intelligence` for forecast runs/cells, model evaluations, and operator feedback.
- [x] Added bounded 28-day seasonal baseline with confidence intervals and maximum 30-day horizon.
- [x] Added scoped run/evaluation/feedback APIs and public-safe hotspot API/methodology.
- [x] Added explicit advisory-only safeguards; forecasts cannot create, prioritize, assign, or close Incidents.
- [x] Added sparse-cohort suppression, asset-linked feature signals, run attempts/leases, drift status, and bounded retry command.
- [x] Added responsive admin `/admin/predictions` UI with provenance, uncertainty, and run controls.
- [x] Added forecast policy and baseline evaluation tests.

## M21 Verification Evidence

- [x] API/web typechecks pass.
- [x] Forecast policy tests pass.
- [ ] Apply migration `0029_predictive_intelligence` to an approved disposable database.
- [ ] Run restored-database run leasing/retry, held-out evaluation, drift, scope, and operator feedback tests.
- [ ] Capture browser accessibility and uncertainty/provenance evidence.

## M20 Implemented

- [x] Added migration `0028_civic_assets` for asset types, assets, import runs, incident links, and maintenance events.
- [x] Added validated checksum-based import preview/apply/rollback APIs with idempotency and non-destructive conflict handling.
- [x] Added public-safe asset directory/detail APIs with coordinate redaction for restricted assets.
- [x] Added scoped incident-to-asset confirmation links with audit events.
- [x] Added maintenance event and condition history commands.
- [x] Added responsive admin asset directory, import preview, and asset history screens.

## M20 Verification Evidence

- [x] API/web typechecks pass.
- [ ] Apply migration `0028_civic_assets` to an approved disposable database.
- [ ] Run restored-database import preview/apply/rollback, checksum idempotency, conflict, link scope, and maintenance concurrency tests.
- [ ] Capture browser accessibility and map/privacy redaction evidence.

## M19 Implemented

- [x] Added migration `0027_civic_health` for versioned policies and immutable daily ward snapshots.
- [x] Added deterministic `m19-v1` scoring with unresolved burden, severity, SLA, recurrence, resolution quality, and citizen confirmation components.
- [x] Added sparse-cohort suppression, confidence, completeness, explanations, and methodology endpoint.
- [x] Added public ward score, detail, and history APIs plus authorized policy preview/creation.
- [x] Added responsive public `/civic-health` scorecard with component explanations and uncertainty states.
- [x] Added civic health formula and normalization tests.
- [x] Added rollback-isolated database contract test for policy and snapshot persistence.
- [x] Migration provisions the default `m19-v1` policy for existing cities and snapshot upserts are idempotent.

## M19 Verification Evidence

- [x] API/web typechecks pass.
- [x] Civic health policy tests pass.
- [ ] Apply migration `0027_civic_health` to an approved disposable database and run `test:integration:m19`.
- [ ] Capture restored-database policy activation, nightly idempotency, scope, and sparse-data evidence.
- [ ] Capture browser accessibility and bilingual civic-health evidence.

## M18 Implemented

- [x] Added versioned metric definitions and daily snapshot schema migration `0026_accountability_metrics`.
- [x] Added privacy-safe public scorecard API with minimum cohort suppression and bounded date windows.
- [x] Added resolution rate, SLA compliance, report volume, median resolution, category, ward, and department aggregates.
- [x] Added reproducible methodology/version metadata and CSV export.
- [x] Added responsive public `/accountability` scorecard with loading, error, privacy, and refresh states.
- [x] Added deterministic metric/privacy policy tests.
- [x] Added rollback-isolated database contract test for metric definitions and snapshots.

## M18 Verification Evidence

- [x] API/web typechecks pass.
- [x] Accountability policy tests pass.
- [ ] Apply migration `0026_accountability_metrics` to an approved disposable database.
- [ ] Run restored-database aggregate reproducibility, late-event, tenant-scope, and suppression tests.
- [ ] Capture browser accessibility and bilingual scorecard evidence.

## M17 Implemented

- [x] Added additive migration `0025_verifiable_audit` with per-incident chain ordering and hash versions.
- [x] Added transaction-scoped audit append locking, canonical stable hashing, and tamper detection.
- [x] Added durable per-incident chain-head anchors so tail deletion and truncation are detectable.
- [x] Added scoped integrity verification and forensic JSON export APIs.
- [x] Added admin incident-workbench audit verification/export controls.
- [x] Preserved citizen-safe lifecycle timeline projection and existing audit history compatibility.
- [x] Added rollback-isolated M17 database harness for append, verification, and tamper detection.

## M17 Verification Evidence

- [x] API/web typechecks pass.
- [x] Canonical audit hashing and tamper-detection tests pass.
- [ ] Apply migration `0025_verifiable_audit` to an approved disposable database.
- [ ] Run restored-database concurrent append, mutation, deletion, reorder, and export tests.
- [ ] Capture browser accessibility evidence for citizen timeline and official forensic controls.

## M16 Implemented

- [x] Added deterministic verification policy tests for GPS, worker provenance, before/after relevance, AI confidence, and review outcomes.
- [x] Added scoped verification read and official approve/reject review APIs with audit/timeline events.
- [x] Added administrative closure only after verified evidence and an expired citizen confirmation window.
- [x] Added seven-day citizen appeal persistence and reopen behavior.
- [x] Added official incident-workbench review controls, deadline-aware administrative closure, and visible failure/success feedback.
- [x] Added citizen-facing resolution appeal UI while preserving confirm/dispute flow.
- [x] Added rollback-isolated M16 database acceptance harness (`test:integration:m16`).
- [x] Preserved asynchronous worker verification and failure-safe `REVIEW_REQUIRED` behavior.

## M16 Verification Evidence

- [x] API/web typechecks pass.
- [x] Resolution verification policy tests pass.
- [x] API route and admin/citizen UI typechecks pass.
- [ ] Apply migration `0024_resolution_appeals` to an approved disposable database.
- [ ] Run `npm run test:integration:m16 --workspace=services/api` against the restored database.
- [ ] Run approved before/after provider fixtures and accessibility/browser evidence.

## M15 Implemented

- [x] Added versioned deterministic priority policy using category risk, severity, public hazard, sensitive location, corroboration, age, SLA proximity, and bounded AI confidence.
- [x] Added priority evaluation and temporary override/revoke APIs with scope checks, expiry limits, reasons, and audit records.
- [x] Added additive priority evaluation/override migration and admin `/admin/priority` workbench.
- [x] Added deterministic policy tests proving repeatability and critical/ordinary thresholds.

## M15 Verification Evidence

- [x] API/web typechecks pass.
- [x] Priority policy tests pass.
- [ ] Apply migration `0023_priority_engine` to an approved disposable database.
- [ ] Run concurrent evaluation/override/revoke, cross-scope denial, expiry, and audit persistence tests.

## M14 Implemented

- [x] Added weighted distance/category/time/visual/hash duplicate scoring with LINK, REVIEW, and SEPARATE bands and human-readable signals.
- [x] Added additive duplicate candidate and decision tables with unique candidate idempotency and reviewer audit fields.
- [x] Added scoped candidate retrieval and municipal review endpoints; citizens cannot access duplicate review.
- [x] Added LINK and NOT_DUPLICATE decisions with audit reasons, Report ownership/history preservation, and reversible decision records.
- [x] Added deterministic duplicate scoring tests.

## M14 Verification Evidence

- [x] API duplicate scoring tests pass.
- [x] Existing proximity/duplicate helper tests remain in the suite.
- [ ] Apply migration `0022_duplicate_intelligence` to an approved disposable database.
- [ ] Run duplicate candidate concurrency, cross-scope denial, link/unlink, and Report-count consistency tests.
- [ ] Add approved visual-embedding provider evaluation before enabling visual similarity as an automatic link signal.

## M13 Implemented

- [x] Added a versioned AI intake policy with explicit advisory-only model metadata and a `/reports/ai-status` endpoint.
- [x] Added bounded category/evidence/severity-driven adaptive follow-up questions; answers are collected and appended to the citizen-confirmed description.
- [x] Added schema/model provenance to draft analysis responses without fabricating confidence when the provider is unavailable.
- [x] Preserved durable post-submission classification, retry/dead-letter behavior, human-review routing, and category confirmation safeguards.
- [x] Added AI intake policy tests, deterministic labelled evaluation fixtures, metadata-redaction tests, and ran the Groq provider contract matrix.

## M13 Verification Evidence

- [x] API and web typechecks pass.
- [x] AI intake policy unit test passes.
- [x] Groq provider contract tests pass using the repository's standard-library harness.
- [x] Added model-registry compatibility/canary checks and a deterministic labelled intake evaluation gate.
- [x] Verified normalized derivatives strip EXIF metadata and public projections remain redacted; sensitive AI signals are classified as redacted-derivative-only.
- [ ] Run the approved live model canary and labelled Indore image set.
- [ ] Run restored-database classification retry, human-review, override, and adaptive-question persistence tests.

## M12 Implemented

- [x] Added a typed notification catalog and server-generated safe deep links.
- [x] Added bounded cursor pagination, unread totals, and an unread-count endpoint for authenticated users.
- [x] Added duplicate-safe realtime insertion, loading/empty/error/retry states, and load-older behavior to the notification bell.
- [x] Added a responsive citizen notification-preferences panel with explicit provider-dependent states for email and SMS.
- [x] Preserved durable notification records, idempotency keys, outbox delivery, retryable worker delivery, and Socket.IO hints.
- [x] Added notification policy tests and ran the worker delivery contract tests.

## M12 Verification Evidence

- [x] API and web typechecks pass.
- [x] Notification policy unit test passes.
- [x] Worker notification delivery contract test passes.
- [ ] Run authenticated preferences, pagination, ownership denial, read/read-all, and unread-count HTTP tests against the restored database.
- [ ] Run approved email provider canary, retry/backoff, bounce/suppression, and recipient lifecycle E2E tests.
- [ ] Verify Socket.IO reconnect reconciliation and notification event deduplication in a browser session.

## M11 Implemented

- [x] Added pure deterministic SLA tier calculation with tier-1, tier-2, and commissioner thresholds.
- [x] Preserved timezone-aware working calendars, holidays, pauses, deadline shifting, and durable escalation event deduplication.
- [x] Required an explicit pause reason and enforced city/zone/department scope before pausing an SLA.
- [x] Added SLA tier and calendar timezone/holiday/DST tests.
- [ ] Complete disposable-database multi-worker escalation, reassignment, pause/resume concurrency, and notification acceptance tests.

## M9 Implemented

- [x] Centralized deterministic routing precedence: ward-specific, city-specific, priority, effective date, stable ID.
- [x] Added routing scope validation helpers for departments, wards, and cities.
- [x] Added precedence and cross-city denial unit tests.
- [x] Preserved routing preview, rule creation/update, fallback/manual-review explanation, and routing decision persistence.

## M10 Implemented

- [x] Added mobile-first `/admin/worker` field operations workspace with assigned, in-progress, submitted, and total queue metrics.
- [x] Added assignment cards with ward, priority, SLA deadline, status, and start-work action.
- [x] Reused backend assigned-worker authorization and guarded start transition.
- [x] Added worker navigation entries and resolution handoff to the incident evidence workflow.
- [ ] Complete offline evidence drafts, attachment retry queue, safety checklist, and disposable-database worker E2E tests.

## M8 Implemented

- [x] Removed fixed `max-w-7xl mx-auto` restrictions on People Directory and Worker Dossier to utilize the full available screen width fluidly.
- [x] Redesigned People Directory cards with modern micro-animations, hover elevations, status badges, and direct navigation to detailed dossier pages.
- [x] Created dedicated Worker Dossier page (`/admin/people/[id]`) showing complete personal & contact info, municipal jurisdiction, active assigned incidents, work orders, field resolution proofs with before/after photos, and security/assignment audit logs.
- [x] Built custom `UserStatusModal` dialog with audit reason justifications and preset chips, completely replacing browser alert/prompt popups for account suspension/reactivation.
- [x] Enriched backend `GET /api/v1/users/:id` endpoint to return assigned incidents, work orders, resolution submissions, assignment history, and aggregated SLA compliance metrics with strict object-level scope checks.
- [x] Added audited suspend/reactivate controls with required reason and session/token revocation on suspension.
- [x] Invitation activation links now expire after one minute, are single-use, and redirect to `/login` after successful activation.
- [x] Added namespaced compatibility permissions with default-deny evaluation and protected workforce route guards.
- [x] Added a protected permission catalog endpoint for role-management UI groundwork.
- [x] Added additive RBAC schema/migration for permissions, protected/custom roles, assignments, scope grants, delegations, organization units, and employment profiles.
- [x] Added role listing/creation and separation-of-duties-checked assignment APIs; custom-role permissions are evaluated when migration tables are available.

## M8 Verification Evidence

- [x] API and web typechecks and production builds pass cleanly (`@civique/api` & `web`).
- [ ] Run directory/detail/suspension HTTP tests against a disposable database.
- [ ] Add protected custom roles, permission assignments, delegation, and organization/employee schema migration.
- [ ] Complete denial matrix for city/zone/ward/department and expired assignments.

M5 carry-forward: lifecycle integration is implemented but still needs the explicitly approved disposable database run.

## M7 Implemented

- [x] Added validated realtime room names with backend authorization for private user, geography, department, and incident rooms.
- [x] Preserved anonymous access to the public room while preventing arbitrary room joins and room impersonation.
- [x] Added strict cursor parsing, bounded resume responses, and explicit resume error handling.
- [x] Added client event-id deduplication, sequence-gap backfill, partial-payload merging, and reconnect reconciliation.
- [x] Added realtime protocol validation tests.

## M7 Verification Evidence

- [x] API and web typechecks pass.
- [x] RBAC permission policy tests pass.
- [x] Realtime protocol unit test passes.
- [x] Durable backlog and LISTEN/NOTIFY integration code remains in place.
- [ ] Run Socket.IO room authorization and reconnect E2E tests with a disposable database.
- [ ] Verify multi-instance notification delivery and retention/order behavior in CI.

## Previous M6 Implemented

- [x] Generalized public coordinates to three decimals and labeled them `APPROXIMATE_100M`.
- [x] Removed internal `priorityScore` from public summary/detail DTOs.
- [x] Added opt-in `cluster=true` response clusters on the privacy grid.
- [x] Added public DTO and clustering unit tests.
- [x] Added responsive accessible list alternative to the public map.

## M6 Verification Evidence

- [x] Public DTO privacy and clustering tests pass.
- [x] API/web typechecks pass.
- [x] API build passes and web production compilation reaches TypeScript successfully.
- [ ] Run public map HTTP redaction checks against the restored database.
- [ ] Verify public detail never exposes identity, private media, exact coordinates, or internal notes.
- [ ] Run responsive/accessibility/browser regression checks.

M4 carry-forward: report/storage E2E and restored-schema acceptance remain open.

## Previous M5 Evidence

- [x] Added `POST /api/v1/incidents/:id/transition` with role, triage-scope, assigned-worker, and state-machine checks.
- [x] Added required idempotency keys and deterministic outbox idempotency keys for replay-safe lifecycle commands.
- [x] Reused transactional audit, lifecycle, and outbox writes for transitions.
- [x] Added transition state-machine tests for valid, invalid, terminal, and reopen paths.
- [x] Added rollback-isolated M5 integration suite covering transition replay, duplicate linking, and cross-city scope denial (`test:integration:m5`).
- [x] Updated the admin incident workbench to use the explicit idempotent transition endpoint for acknowledgement and work-start commands.

## Previous M5 Verification Evidence

- [x] API typecheck, tests, and build pass.
- [ ] Run `npm run test:integration:m5 --workspace=services/api` against an explicitly approved disposable database; the restored Supabase target requires operator authorization for transient test writes.
- [x] Cross-role/cross-city scope assertions are covered in the rollback-isolated suite and policy matrix.
- [x] Lifecycle UI uses explicit command endpoints and displays replay/error outcomes.

M3 carry-forward: geography import and tenant-isolation acceptance remain open until migrations `0018` and `0019` are applied.

## Previous M4 Evidence

- [x] Added explicit citizen consent checkbox and disabled submission until consent is accepted.
- [x] Preserved one idempotency key across a submission retry so network retries cannot create duplicate Reports.
- [x] Corrected report location resolution to use the API's `lat`/`lng` contract and canonical ward/zone response fields.
- [x] Added restore-safe baseline taxonomy migration `0020_taxonomy_baseline` and server-side category bootstrap for supported categories.
- [x] Added globally themed success/error toasts for report submission and AI/upload failures.
- [x] Preserved server-side image type, corruption, size, pixel-limit, private-storage, and consent-version validation.
- [x] Preserved AI failure-safe behavior: draft classification can fail without preventing manually completed report submission.

## Previous M4 Verification Evidence

- [x] Web typecheck passes after the reporting changes.
- [x] API build passes.
- [ ] Run authenticated report submission against the restored database and storage bucket.
- [ ] Apply migrations `0018`, `0019`, and `0020` to the restored database before retrying login/report submission.
- [ ] Verify retrying the same request returns the idempotent replay response.
- [ ] Verify invalid/hostile image fixtures fail safely and do not create a Report.
- [ ] Verify out-of-service coordinates return explicit serviceability errors.
- [ ] Add Hindi/English, offline draft, anonymous tracking, accessibility, and browser E2E evidence.

M2 carry-forward: implementation is complete but its database-backed acceptance rerun remains open until the local/approved database is available.

## Previous M3 Evidence

- [x] Added deterministic geometry/checksum validation helpers and unit tests.
- [x] Added idempotent `POST /api/v1/geography/import` with city scope enforcement, source/version conflict detection, checksum verification, transactional zone/ward upserts, and active dataset metadata.
- [x] Added scoped `GET /api/v1/geography/datasets` history endpoint.
- [x] Added explicit city filtering to the public city hierarchy endpoint.
- [x] Added responsive admin Geography page for dataset import and checksum history.
- [x] Added Geography navigation for official/admin roles.

## Previous M3 Verification Evidence

- [x] Geography validation and checksum unit checks pass.
- [x] API typecheck and build pass.
- [x] Web typecheck passes and the new Geography route compiles with the production webpack build pipeline.
- [ ] Apply migration `0019_geography_imports` against the restored disposable/approved database.
- [ ] Run deterministic coordinate fixtures against the imported Indore boundary dataset.
- [ ] Run import idempotency, checksum conflict, unsupported-area, and cross-city denial HTTP tests.
- [ ] Run accessibility/responsive browser checks and hosted CI gates.

## Previous M2 Evidence

- [x] Added additive MFA and security-event schema migration `0018_identity_security`.
- [x] Added encrypted official TOTP enrollment, confirmation, challenge, and verification with replay-safe short-lived challenges.
- [x] Added double-submit CSRF protection to cookie-backed refresh/logout operations.
- [x] Added user-owned session listing and revocation.
- [x] Added authentication security events for login, MFA, logout, recovery, suspension, and refresh replay paths.
- [x] Preserved citizen-only public registration and hashed single-use recovery/invitation tokens.
- [x] Added MFA unit tests and local HTTP integration coverage.
- [x] Added responsive profile security UI for official MFA enrollment/confirmation and active-session revocation.
- [x] Added sign-in MFA challenge UI using the short-lived challenge token and CSRF bootstrap cookie.

## Verification Evidence

- [x] API and worker unit tests pass through `npm test`, including MFA TOTP and encryption tests.
- [x] All workspace typechecks pass through `npm run typecheck` after regenerating Prisma Client.
- [x] API, worker, and webpack web production builds pass.
- [x] Local M2 migration applied to `civique_test` using explicit local connection overrides.
- [x] Authentication lifecycle integration passes refresh replay and token single-use checks.
- [x] HTTP authentication integration passes registration, recovery replay, invitation, MFA, CSRF, suspension, and security-event checks.
- [ ] `npm run lint` still reports 93 errors and 93 warnings in the existing web UI.
- [x] Row-level permission/scope policy matrix tests pass in the API unit suite.
- [ ] Re-run database-backed HTTP authentication acceptance once local PostgreSQL is available.
- [ ] Add dedicated browser accessibility/security E2E evidence in CI.
- [ ] Hosted CI and production-like security/migration/restore drills remain outstanding.

## Safety Note

The local restore database `civique_restore_m1_20260920` and its container-local dump remain available for inspection. They were not deleted because destructive cleanup was not authorized. M2 migration and integration commands must override the remote `.env` database explicitly.

## Blocked

- Database-backed M2/M3 acceptance is waiting for the restored PostgreSQL/Supabase environment; no remote mutation was attempted.

## Next Gate

Run M6 public DTO redaction, clustering, and browser accessibility evidence against the approved environment. Do not start M7 until M6 evidence is recorded.

## Latest Fix

- [x] Hardened field-worker resolution photo submission: parallel storage uploads, partial-upload cleanup tracking, leaner transaction payload, explicit Prisma transaction budgets, and sanitized retry-safe P2028 handling.
- [ ] Verify resolution submission end-to-end with a real assigned field-worker account against the restored Supabase database.

See [`ACCEPTANCE_MATRIX.md`](ACCEPTANCE_MATRIX.md) for module-by-module evidence.
