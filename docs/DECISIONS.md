# Architectural Decisions Log: Civique

---

## ADR-013: Durable, User-Owned Notification Delivery and Safe Navigation

### Date
2026-09-21

### Decision

Persist every lifecycle notification before attempting external delivery. Treat in-app records as the durable fallback, expose user-owned cursor-paginated reads with unread totals, and return an API-generated allow-listed deep link rather than letting clients construct navigation from arbitrary notification data. Socket.IO delivery is an optimization; reconnecting clients reconcile from the durable API. Email and SMS remain provider-dependent, retryable worker attempts and are never reported as delivered without provider confirmation.

### Reason

Citizens need a reliable, auditable view of report progress even when email, SMS, workers, or sockets are unavailable. Cursor pagination prevents an unbounded inbox, object-level ownership checks protect private lifecycle data, and server-generated links avoid unsafe client-side URL construction.

### Alternatives Considered

- Rely only on Socket.IO: rejected because browser sessions disconnect and events can be missed.
- Construct report URLs in the browser from `incidentId`: rejected because future notification types may not be incident links and navigation must remain allow-listed.
- Mark email as successful when queued: rejected because queue acceptance is not provider delivery.

### Consequences

- Notification consumers must handle `hasMore`, `nextCursor`, `unreadCount`, and null links.
- Email/SMS preference toggles remain disabled until approved providers are configured and tested.
- M12 remains `PARTIAL` until restored-database HTTP, provider, reconnect, and recipient E2E evidence is recorded.

---

## ADR-012: Official TOTP MFA, Cookie CSRF, and Security Events

### Date
2026-09-20

### Decision

Require TOTP MFA for privileged official accounts through an additive enrollment and challenge flow. Generate secrets server-side, encrypt them with `MFA_ENCRYPTION_KEY`, expose the secret/otpauth URI only during authenticated enrollment, and issue a five-minute signed challenge before creating a normal session. Protect cookie-backed refresh, logout, and MFA challenge mutations with a double-submit CSRF token while preserving bearer-token API compatibility. Persist bounded authentication security events with user, request, user-agent, and truncated IP context.

### Reason

Official municipal accounts can change routing, assignments, and citizen-visible state; password-only access is insufficient. Refresh and logout endpoints accept browser cookies and therefore need CSRF protection even when the access token is HttpOnly. Durable security events provide incident response and account-audit evidence without storing raw passwords, tokens, or MFA secrets.

### Alternatives Considered

- Store TOTP secrets in plaintext: rejected because a database read would immediately compromise all enrolled officials.
- Require MFA synchronously during public citizen registration: rejected because citizens are not privileged operators and reporting must remain low-friction.
- Use only SameSite cookies: rejected because SameSite is defense-in-depth, not a complete request-integrity control.
- Store security events only in logs: rejected because logs are not a durable, queryable account-audit record.

### Consequences

- Production requires a 32-byte `MFA_ENCRYPTION_KEY`; rotating it requires a planned secret re-encryption procedure.
- M2 currently provides API enrollment/verification and session revocation; official MFA/session screens and recovery policy remain acceptance work.
- Security-event writes are bounded and must never include raw credentials, refresh tokens, TOTP codes, or private report data.

---

## ADR-011: Failure-Safe Readiness and Owner-Bound Job Leases

### Date
2026-09-20

### Decision

Treat database, required schema, queue schema, and explicitly required object storage as API-readiness blockers. Treat worker and AI unavailability as degraded dependencies so durable citizen intake remains available. Durable jobs may be completed or failed only by the active lease owner; long handlers renew their lease, exhausted jobs enter a dead-letter state, and shutdown drains the active job within a bounded grace period.

Use Next.js production builds with bundled local fonts and the supported in-process TypeScript compiler API. This preserves build-time type checking while avoiding network font fetches and an empty TypeScript CLI capture observed in the current sandbox.

### Reason

Core civic reporting must survive auxiliary-service outages, while processes that cannot safely read or persist authoritative state must leave load-balancer rotation. Lease ownership prevents a stale worker from overwriting a job reclaimed after timeout. Deterministic builds cannot depend on external font hosts or unreliable subprocess output capture.

### Alternatives Considered

- Mark every dependency outage as HTTP 503: rejected because AI and worker outages must not block Report persistence.
- Allow completion by job ID alone: rejected because a timed-out worker could race the new lease owner.
- Disable Next.js type checking: rejected because a passing production build must remain a type-safety gate.

### Consequences

- `/ready` returns `READY`, `DEGRADED`, or `NOT_READY` with separate degraded and blocking reasons.
- Worker lease, retry, dead-letter, restart, and stale-owner behavior has isolated PostgreSQL integration coverage.
- Queue handlers must be idempotent even with owner enforcement because a lease can expire after an external side effect.
- Production builds use webpack by default in this environment; the Turbopack script remains available for environments that support it.
- M1 remains `PARTIAL` until lint, hosted CI, fresh migration, and production-like restore gates pass.

---

## ADR-010: Single Master Specification, Protected Custom RBAC, and Opt-In Civique Socio

### Date
2026-09-20

### Decision

Use `Implementation.md` as Civique's sole authoritative product, architecture, security, UX, and module specification. Supporting delivery, UI, execution, context, task, and acceptance documents have non-overlapping responsibilities and cannot independently redefine module status.

Evolve authorization additively from the legacy single `User.role` enum to protected system role templates plus custom roles, stable permission keys, scoped assignments, expiring delegations, organization units, and employee profiles. Reserved permissions and separation of duties prevent custom-role self-elevation.

Implement Civique Socio as an explicit-consent, alias-based, moderated public projection of an existing Report or Incident. A Socio post is not a second official complaint. Ordinary engagement never directly changes municipal priority or SLA, and removing a post never deletes the underlying civic or audit record.

### Reason

Competing planning documents and historical completion labels obscured current implementation truth. The current enum role cannot express real municipal responsibilities, temporary authority, or object scope safely. A public civic feed can improve transparency and corroboration, but only if identity, location, evidence, moderation, ranking, and official workflow remain clearly separated.

### Alternatives Considered

- Keep several co-equal implementation plans: rejected because conflicts cannot be resolved predictably.
- Replace the eight roles with unrestricted dynamic permissions immediately: rejected because migration and privilege-escalation risk are too high.
- Keep fixed roles only: rejected because real municipal teams require custom duties and temporary delegation.
- Publish all Reports automatically: rejected because consent, safety, location, and evidence privacy differ from operational intake.
- Let likes determine priority: rejected because engagement is gameable and is not a substitute for civic risk or policy.

### Consequences

- `docs/ACCEPTANCE_MATRIX.md` is the only current module status/evidence registry.
- M1–M13 remain `PARTIAL` until the master Definition of Done passes, regardless of historical UI or module labels.
- RBAC migration must use additive tables, backfill, dual-policy comparison, endpoint-by-endpoint cutover, and parity/denial tests before retiring enum authorization.
- Socio ships as M22–M23 behind independent privacy and moderation gates after the core trust/accountability foundations.
- M24–M25 add approved integration adapters and tenant expansion without changing the Indore-first pilot boundary.

---

## ADR-007: Hashed Auth Action Tokens and Post-Persistence Classification

### Date
2026-09-09

### Decision
Use random, SHA-256-hashed, expiring, single-use database tokens for password recovery and privileged-account invitations. Resetting a password or suspending an account revokes active sessions. Final Report classification is no longer part of the intake request: Report, Incident, media provenance, pending AI analysis, and a `REPORT_CLASSIFICATION` job are committed together, then the worker reads only a private normalized derivative and advances `AI_REVIEW` to `OPEN` transactionally.

### Reason
Authentication actions must resist token database disclosure and replay, and citizen reporting must succeed independently of ML availability. Separating immutable originals from metadata-free derivatives also prevents private evidence from becoming a public or provider-facing object accidentally.

### Alternatives Considered
- Synchronous final classification during intake: rejected because provider latency or outage blocked the core reporting path.
- Storing recovery or invitation tokens in plaintext: rejected because database disclosure would immediately activate them.
- Reusing uploaded originals for display and AI: rejected because metadata, orientation, decompression, and privacy controls require a normalized derivative boundary.

### Consequences
- Migrations `0011`–`0013` add auth-action tokens, media kinds/derivatives, and resolution evidence provenance.
- Production API/worker configuration requires a Supabase service-role key; it is never exposed to the web client.
- Provider failures leave analysis pending for durable retry, while successful classification appends audit and outbox records.
- Live Groq calls still require explicit permission because they may incur cost.

---

## ADR-006: Deterministic Local Font and API Test Execution

### Date
2026-09-07

### Decision
Use a bundled local Inter font through `next/font/local` for the web root layout, and run the existing API assertion suites through an explicitly declared `ts-node` test command instead of referencing an unavailable Jest installation.

### Reason
The production web build must not depend on a runtime Google Fonts request, and the API test command must execute the repository's current tests in a clean checkout. This is an interim P0 reliability measure; the UX0 component harness may add a dedicated test framework later if required.

### Consequences
- Web webpack builds work without external font network access.
- API distance, duplicate-helper, and geofence tests are runnable through `npm test --workspace=services/api`.
- The bundled font asset should be replaced with the reviewed Inter/Fira Code asset set during UX0 if the current asset provenance is not accepted.
- Turbopack process-binding limitations remain an environment issue independent of font loading.

---

## ADR-005: Incremental Cloudflare/TweakCN UI Design System

### Date
2026-08-31

### Decision
Adopt the exact TweakCN Cloudflare theme `cmqx9le2j000504l49jgxe1d0` as Civique's base frontend token system and use shadcn/ui primitives for the redesigned component layer. Migrate the interface incrementally through UX0–UX10 while preserving existing URLs, API contracts, RBAC, uploads, maps, notifications, and real-time behavior.

Use Inter as the primary UI typeface and Fira Code for identifiers and technical data, preferably through locally bundled font assets. Keep Civique-specific lifecycle and priority colors as accessible semantic extensions rather than altering the selected base theme.

### Reason
The current frontend repeats hard-coded colors and locally implemented controls across pages, making visual consistency and workflow quality difficult to maintain. The selected preset supplies a coherent light/dark token system, and shadcn provides source-owned accessible primitives compatible with the existing Next.js and Tailwind CSS stack.

An incremental migration is required because the current UI already contains working authentication, reporting, upload, map, notification, assignment, and real-time flows that must not regress.

### Alternatives Considered
- Keep the existing burgundy/cream custom theme: rejected by the user's explicit redesign direction and current consistency problems.
- Copy Cloudflare page layouts literally: rejected because Civique's civic workflows, roles, privacy requirements, and incident lifecycle require product-specific information architecture.
- Delete and replace the entire frontend in one pass: rejected because it would make functional regressions difficult to detect and review.
- Install every shadcn component up front: rejected to avoid unnecessary dependencies and an oversized unreviewed component surface.

### Consequences
- `docs/UI_IMPLEMENTATION_PLAN.md` is the detailed UI companion; `Implementation.md` remains the sole master specification under ADR-010.
- UX0 must establish the exact theme, fonts, primitives, preview, and baseline tests before feature pages are redesigned.
- Existing legacy CSS remains temporarily available for unmigrated pages.
- No new page-level hard-coded theme colors should be introduced after UX0.
- Each redesigned route requires a functionality-preservation contract, responsive checks, accessibility checks, and user review before the next UX module begins. ADR-010 extends the program through UX14.
- Civique branding will use the theme palette but will not copy Cloudflare's corporate logo.

---

## ADR-004: PostgreSQL Durable Jobs and Transactional Outbox

### Date
2026-08-30

### Decision
Use PostgreSQL for durable jobs and outbox events. Workers claim jobs with `FOR UPDATE SKIP LOCKED`, leases, exponential retry backoff, idempotency keys, and a dead-letter state.

### Reason
This preserves the PostgreSQL-first architecture while replacing the mock worker without introducing a second queue dependency.

### Consequences
The M1 migration must be applied before jobs run; later modules must enqueue idempotent jobs and move legacy interval scanners behind handlers.

## ADR-001: Use NPM Workspaces for Monorepo Configuration

### Date
2026-08-15

### Decision
Use npm workspaces to manage monorepo architecture, partitioning the platform into apps, services, and shared packages.

### Reason
The node host environment has Node.js (v22.22.1) and npm (9.2.0) available. Yarn and pnpm are not installed, and npm workspaces provides native, zero-dependency monorepo tracking.

### Alternatives Considered
- **Yarn Workspaces**: Cannot be used without installing yarn on the host.
- **Pnpm Workspaces**: Not available globally.

### Consequences
- Single `package.json` in the root manages general workspace paths and commands.
- Symlinks packages and workspaces locally so TypeScript dependencies compile easily.
- Workspace targets run commands globally or on specific packages (e.g. `npm run dev --workspace=apps/web`).

---

## ADR-003: Use Groq Qwen 3.8 Through a Provider-Neutral Vision Boundary

### Date
2026-08-30

### Decision
Use Groq model `qwen/qwen3.8-27b` as Civique's selected multimodal provider for planned report-image validation, category suggestion, uncertain duplicate-pair review, advisory severity signals, and before/after resolution analysis.

The integration will be implemented behind a provider-neutral FastAPI `VisionAnalysisProvider`. The existing Gemini provider and dependency will be removed during the corrected M13 module, not during planning.

### Reason
- The user explicitly selected Groq Qwen 3.8 instead of Gemini.
- The model accepts text and images and supports strict JSON Schema output.
- A provider boundary prevents civic workflows from depending directly on one SDK or model identifier.
- Structured output and stored provenance make AI recommendations testable and auditable.

### Alternatives Considered
- **Existing ConvNeXt/ImageNet mapping**: Retained only as historical prototype code until M13 correction; it is not a sufficiently trained civic classifier.
- **Gemini multimodal provider**: Rejected by explicit product decision.
- **Groq for all duplicate retrieval**: Rejected because pairwise multimodal calls are not a scalable vector index. M14 will use local versioned 1024-dimensional embeddings and reserve Qwen for uncertain candidates.
- **Synchronous Groq dependency during report creation**: Rejected because core reporting must continue during provider failure.

### Consequences
- Planned environment variables include `GROQ_API_KEY` and `GROQ_MODEL=qwen/qwen3.8-27b`.
- Groq calls occur server-side only and may incur external cost; live calls require explicit permission and a user-provided key.
- Every result must store provider, model, prompt/schema version, request hash, status, latency, token usage, timestamps, output, and failure/refusal state.
- Strict structured responses are validated locally before use.
- Provider timeout, rate limit, refusal, invalid output, or outage produces `PENDING` or `REVIEW_REQUIRED`; it does not block report creation.
- Qwen remains advisory. It cannot independently merge incidents, set final priority, or resolve incidents.
- Because the selected model is currently a preview offering, its model ID remains configurable and readiness/canary checks must detect availability changes.
## ADR-008: Durable Sequenced Realtime Events

### Date
2026-09-09

### Decision
Persist public incident realtime envelopes in PostgreSQL with a monotonic sequence, expose cursor-based backfill, and make the web map reconcile events idempotently after reconnect.

### Reason
Socket delivery is best effort and clients can disconnect between the initial map query and a later update. A durable cursor lets clients recover missed incident changes without trusting client-supplied room membership or replaying arbitrary private data.

### Alternatives Considered
- Rely only on Socket.IO delivery: rejected because disconnected clients permanently miss events.
- Use a second broker: rejected because Civique already has PostgreSQL durable infrastructure and the public event volume is currently bounded.
- Replay full incident queries on reconnect: rejected because it is more expensive and does not provide an auditable event cursor.

### Consequences
- Migration `0014_realtime_events` adds the sequenced journal and indexes.
- The public backfill endpoint returns only redacted incident envelopes and caps each page at 250 events.
- Retention/compaction policy is still required before production scale-up.

---
## ADR-009: Preference-Aware Durable Notification Delivery

### Date
2026-09-09

### Decision
Create one notification record per idempotency key, persist one delivery attempt per enabled channel, and dispatch email/SMS through durable PostgreSQL jobs. In-app delivery remains immediate through the authenticated Socket.IO room. Email uses Resend only when explicitly configured; SMS remains pending configuration until a provider is selected.

### Reason
Notification creation must not be lost or duplicated when workers restart, preferences change, or a provider fails. Keeping channel attempts separate makes retries and audit state explicit.

### Alternatives Considered
- Send email synchronously in the request: rejected because provider latency/failure must not block civic operations.
- Treat an in-app preference opt-out as suppressing the notification record: rejected because delivery preference should not erase audit/history or other enabled channels.
- Add a provider SDK immediately: rejected to keep local development cost-free and avoid committing to an SMS vendor before approval.

### Consequences
- Migration `0016_notification_dispatch` adds notification idempotency and provider attempt metadata.
- Unconfigured external channels become `PENDING_CONFIGURATION`, not falsely `SENT`.
- A Resend canary and retry integration test require explicit provider configuration and approval.

---

## ADR-010: Separate Civic Relevance from Image Authenticity

### Date
2026-09-23

### Decision
M13 vision intake must return separate authenticity, civic-relevance, and decision fields. An authentic image that does not visibly depict a public or municipal problem is rejected as non-civic evidence. Accepted and ambiguous images may receive image-specific citizen follow-up questions; rejected images receive none.

### Reason
The previous contract could label a logo or unrelated graphic as real and still present it as an “Other Civic Grievance.” Authenticity answers whether the visual appears genuine; it does not answer whether it is relevant to a civic report.

### Alternatives Considered
- Treat every authentic image as valid: rejected because it admits logos, advertisements, documents and unrelated objects into civic triage.
- Reject every uncertain image: rejected because low-quality but potentially valid civic evidence should receive human review.
- Use a generic “Other” category: rejected because it hides irrelevant evidence and weakens routing and accountability.

### Consequences
- Groq returns `ACCEPT`, `REJECT`, or `REVIEW_REQUIRED` with `civic_relevance` and `authenticity` separately.
- For accepted or ambiguous evidence, the first pass returns image-specific questions with exactly three choices. A second Groq pass receives the citizen's answers and produces the detailed triage insight shown for confirmation.
- The citizen UI blocks “Accept & Apply” for rejected evidence and explains what replacement evidence is needed.
- The worker preserves the decision and prevents a rejected first report from opening an Incident; existing Incidents are not rejected because of one unrelated corroborating image.
- AI remains advisory and cannot independently resolve, assign, prioritize or close an Incident.

---
