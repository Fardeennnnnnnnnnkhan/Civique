# Architectural Decisions Log: Civique

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
- `docs/UI_IMPLEMENTATION_PLAN.md` is the UI program source of truth.
- UX0 must establish the exact theme, fonts, primitives, preview, and baseline tests before feature pages are redesigned.
- Existing legacy CSS remains temporarily available for unmigrated pages.
- No new page-level hard-coded theme colors should be introduced after UX0.
- Each redesigned route requires a functionality-preservation contract, responsive checks, accessibility checks, and user review before the next UX module begins.
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
