# Project Context: Civique

This document serves as the persistent engineering memory for **Civique**.

## Current Project Status
- **Current Phase**: Correction-first implementation
- **Current Module**: M13 — Groq Qwen Multimodal Classification (implemented; acceptance testing required)
- **Authoritative Plan**: [`docs/IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md)
- **UI Transformation Program**: UX0 — Design Foundation and Safety Baseline (plan complete; implementation not started)
- **UI Plan**: [`docs/UI_IMPLEMENTATION_PLAN.md`](UI_IMPLEMENTATION_PLAN.md)
- **Verified Complete Modules**: None under the new Definition of Done.
- **Prototype Implementation Present**:
  - M1–M13 contain meaningful implementation and form a partial operational vertical slice.
  - These modules must be corrected and accepted individually before Civique advances to M14.
- **In-Progress Work**:
  - Completing M7 socket authorization, room isolation, and reconnect acceptance tests.
  - Completing M12 notification delivery tests and M13 Groq contract/canary tests.
  - UI implementation is reverted to the pre-UX0 state per user request; UX0 plan remains available.
- **Pending Corrections**:
  - Remaining M2 invitation/recovery and web migration, M4 image normalization/signed delivery, M5 citizen confirmation/dispute, M6 admin detail DTO, M7 event backfill, then M8–M13.
- **Pending New Modules**:
  - M14–M21 after the corrected foundation is accepted.

## Architecture Summary
Civique is a full-stack GovTech platform featuring:
- **Next.js PWA** frontend using Tailwind CSS.
- **Express.js API** backend using TypeScript and Node.js.
- **FastAPI** service for deep-learning components.
- **PostgreSQL (Supabase)** database with Prisma ORM.
- **Planned AI Provider**: Groq using `qwen/qwen3.8-27b` through a provider-neutral FastAPI boundary.
- **Background Execution**: Durable PostgreSQL job/outbox worker with leases, retries, backoff, idempotency, and dead-letter state.

## Technology Stack
- **Languages**: TypeScript, Python
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma ORM
- **Frontend Design Direction**: Tailwind CSS 4, shadcn/ui primitives, and the exact TweakCN Cloudflare theme `cmqx9le2j000504l49jgxe1d0`.

## Frontend Decisions
- Redesign Civique incrementally through UX0–UX10 while preserving URLs, API contracts, RBAC, uploads, maps, and real-time behavior.
- Adopt the supplied Cloudflare theme tokens exactly for base surfaces, brand color, typography, radius, and shadows; extend them only with accessible civic lifecycle and priority semantics.
- Use Inter for UI typography and Fira Code for identifiers/technical data, preferably self-hosted through deterministic local font assets.
- Establish shadcn primitives in `components/ui` and Civique domain components separately; stop adding page-level hard-coded theme colors after UX0.
- Do not delete the legacy theme or components until every consumer has migrated and passed visual, accessibility, and workflow tests.

## Database Decisions
- **Spatial Boundaries**: Storing 85 Indore ward administrative boundaries in a `Json` column on `Ward` table using standard GeoJSON `MultiPolygon` structure.
- **State Relation**: Introduced a `State` table representing states (e.g. Madhya Pradesh) and linked to `City` via foreign key relationship.
- **Geofencing Engine**: Built a coordinate-to-boundary resolution utility implementing a Ray-Casting algorithm in TypeScript, natively supporting both GeoJSON `Polygon` and `MultiPolygon` structures.

## Security Decisions
- Backend-enforced RBAC (Role-Based Access Control) supporting 8 distinct roles.
- `CITIZEN` is a full platform role: public registration always creates this role. `FIELD_WORKER`, `WARD_OFFICER`, `DEPARTMENT_HEAD`, `ZONAL_OFFICER`, `COMMISSIONER`, `CITY_ADMIN`, and `SUPER_ADMIN` are privileged roles provisioned by authorized workflows.
- Citizen submission allows anonymous tracking codes.
- Public registration must create only `CITIZEN`; privileged roles require an authorized invitation/admin workflow.
- Public API contracts must use explicit redacted DTOs and never expose raw Report records.
- AI is advisory and cannot independently merge, prioritize, or resolve incidents.

## AI Decisions
- Gemini is no longer the selected provider.
- The selected multimodal model is Groq `qwen/qwen3.8-27b`.
- Groq analysis must use strict structured output, versioned provenance, queued retry, failure-safe fallback, and human override.
- Local deterministic preprocessing and 1024-dimensional embeddings remain required for media safety and scalable duplicate candidate retrieval.

## Known Issues
- Configured PostgreSQL/Supabase database was unreachable during the 2026-08-30 audit.
- A Prisma baseline migration is present but not applied because the configured remote database is unreachable.
- M3 adds `GeographyDataset` version/checksum metadata and validates idempotent GeoJSON imports; migration `0003_geography_metadata` must be applied before seeding.
- M4 adds private `MediaAsset` records, magic-byte validation, SHA-256 hashes, random storage keys, and one-year retention metadata; migration `0004_secure_media` must be applied before report creation.
- M5 adds transition enforcement, atomic audit/outbox writes, duplicate selection validation, and report idempotency; migration `0005_incident_transaction_safety` must be applied before idempotent report submissions.
- M6 public map list responses use an explicit redacted DTO, enforce `isPublic`, bound bbox/limits, and never serialize reports or media URLs.
- Development role testing uses `npm run prisma:seed:demo-users --workspace=services/api` with a local `DEMO_USER_PASSWORD`; demo accounts are never created automatically in production.
- Admin incident operations now use a themed assignment modal and worker evidence dropzone; incident-list API mapping is defensive against missing `trackingId`, description, category, and ward fields.
- Prisma is configured with `DATABASE_URL` for pooled runtime traffic and `DIRECT_URL` for migration/session-mode traffic; both must be supplied in local environment files.
- The worker now claims durable PostgreSQL jobs; legacy SLA/ML interval functions remain for later migration.
- Public incident endpoints can expose nested Report/contact data and do not consistently enforce `isPublic`.
- Registration accepts a client-provided role and JWT code has insecure fallback secrets.
- Refresh tokens are not stored/revoked and web tokens are kept in `localStorage`.
- Socket.IO allows open CORS and unauthenticated client-selected user-room joins.
- Mutation endpoints do not consistently enforce city/zone/ward/department object scope.
- Upload validation trusts client MIME metadata and evidence originals use public URLs.
- Duplicate detection is distance-only; citizen-selected duplicate IDs are ignored by the backend.
- Admin People is now API-backed and scoped; Analytics now honestly reports unavailable until M18; Settings controls are read-only until persistence APIs are implemented.
- SLA execution is an in-process one-tier interval rather than a durable tiered engine.
- Email and SMS delivery are not implemented despite UI labels.
- Current AI usually falls back to ImageNet mapping or text heuristics; Gemini code is present but unwired.
- Resolution verification, citizen confirmation/dispute, and the full audit verification flow are incomplete.
- Lint currently fails and Jest is referenced but not installed.
- Most feature work is uncommitted; preserve the existing dirty worktree.

## Environment Requirements
- Node.js (v22.22.1+)
- Python (3.14+)
- Postgres (Supabase)

## Next Recommended Task
- Apply migrations `0006_department_routing` through `0010_ai_analysis` to a reachable development database, run M12/M13 acceptance tests, then continue M14.

## Module Completion History

> The entries below are historical implementation notes. Their former `Completed` labels predate the correction-first Definition of Done and do not represent current acceptance status.

### Module: M6 — Public Live Map
- **Status**: Completed
- **Implemented**: Interactive live map view with Leaflet, status/category filter checkboxes, case inspection drawers, and premium styling.
- **Files Changed**:
  - [apps/web/app/map/page.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/map/page.tsx)
  - [services/api/src/routes/incidents.ts](file:///home/fardeen/Documents/Projects/Civique/services/api/src/routes/incidents.ts)
  - [services/api/src/app.ts](file:///home/fardeen/Documents/Projects/Civique/services/api/src/app.ts)
- **Database Changes**: None
- **API Changes**:
  - `GET /api/v1/incidents` (with `bbox`, `status`, and `category` query filters)
  - `GET /api/v1/incidents/:id` (fetch single incident with ward boundaries and linked reports)
- **Frontend Changes**:
  - Real-time filtered map screen under `/map` with search filters, dynamic category/status checkboxes, custom pulsing map markers, and slide-over side-panel drawer.
- **Real-time Changes**: None (scheduled for M7)
- **Tests**: Monorepo typechecking passes; REST endpoints verified.
- **Known Issues**: None
- **Next Module**: M7 — Real-Time Communication

### Module: M7 — Real-Time Communication
- **Status**: Completed
- **Implemented**: Socket.io configuration on Express backend wrapping HTTP, broadcasting event triggers for incident creation/updates, and client-side listeners updating Next.js map states instantly.
- **Files Changed**:
  - [services/api/src/utils/socket.ts](file:///home/fardeen/Documents/Projects/Civique/services/api/src/utils/socket.ts)
  - [services/api/src/server.ts](file:///home/fardeen/Documents/Projects/Civique/services/api/src/server.ts)
  - [services/api/src/routes/reports.ts](file:///home/fardeen/Documents/Projects/Civique/services/api/src/routes/reports.ts)
  - [apps/web/package.json](file:///home/fardeen/Documents/Projects/Civique/apps/web/package.json)
  - [apps/web/app/utils/socket.ts](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/utils/socket.ts)
  - [apps/web/app/map/page.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/map/page.tsx)
- **Database Changes**: None
- **API Changes**: Added WebSockets layer under existing HTTP server.
- **Frontend Changes**: Dynamically connects map page to socket server and synchronizes state values.
- **Real-time Changes**: Integrates Socket.io gateway sync.
- **Tests**: Workspace typechecking passes.
- **Known Issues**: None
- **Next Module**: M8 — Admin Dashboard

### Module: M8 — Admin Dashboard
- **Status**: Completed
- **Implemented**: Integrated real-time metric calculation endpoints scoped dynamically to active user scopes, dynamic map preview, and guarded admin layout access.
- **Files Changed**:
  - [services/api/src/routes/incidents.ts](file:///home/fardeen/Documents/Projects/Civique/services/api/src/routes/incidents.ts)
  - [apps/web/app/admin/page.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/admin/page.tsx)
- **Database Changes**: None
- **API Changes**:
  - Updated `GET /api/v1/incidents` to support role-scoping geographic/department queries.
  - Added `GET /api/v1/incidents/admin-metrics` (SLA compliance, open counts, resolved today, recent scoped actions).
- **Frontend Changes**:
  - Refactored admin overview dashboard to bind with dynamic backend metrics, loaded ticket lists in a premium table, and rendered interactive Leaflet previews showing only incidents inside scope.
- **Real-time Changes**: Scoped database reads.
- **Tests**: Entire workspace typechecking passes.
- **Known Issues**: None
- **Next Module**: M9 — Department Routing

### Module: M9 — Department Routing
- **Status**: Completed
- **Implemented**: Populated Indore default municipal utility departments, integrated automatic category routing with dynamic SLA deadline updates, added manual routing assignment endpoints with cryptographic change tracking, and refactored the admin view form to bind inputs dynamically.
- **Files Changed**:
  - [services/api/prisma/seed.ts](file:///home/fardeen/Documents/Projects/Civique/services/api/prisma/seed.ts)
  - [services/api/src/utils/audit.ts](file:///home/fardeen/Documents/Projects/Civique/services/api/src/utils/audit.ts)
  - [services/api/src/routes/users.ts](file:///home/fardeen/Documents/Projects/Civique/services/api/src/routes/users.ts)
  - [services/api/src/routes/geography.ts](file:///home/fardeen/Documents/Projects/Civique/services/api/src/routes/geography.ts)
  - [services/api/src/routes/incidents.ts](file:///home/fardeen/Documents/Projects/Civique/services/api/src/routes/incidents.ts)
  - [services/api/src/routes/reports.ts](file:///home/fardeen/Documents/Projects/Civique/services/api/src/routes/reports.ts)
  - [services/api/src/app.ts](file:///home/fardeen/Documents/Projects/Civique/services/api/src/app.ts)
  - [apps/web/app/admin/incidents/[id]/page.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/admin/incidents/[id]/page.tsx)
- **Database Changes**: Seeding municipal departments linked to Indore.
- **API Changes**:
  - Added `GET /api/v1/geography/departments` (lists seeded departments).
  - Added `GET /api/v1/users/workers` (lists active field workers).
  - Added `POST /api/v1/incidents/:id/assign` (assigns incident to department and/or worker, updating status).
  - Added `PATCH /api/v1/incidents/:id/status` (updates incident state with machine validation).
- **Frontend Changes**:
  - Upgraded incident detail operations form to query routing metadata and handle dynamic updates.
  - Replaced mockup geofence map with an interactive Leaflet map instance centering the incident.
- **Real-time Changes**: WebSockets broadcast updates on status/assignment changes.
- **Tests**: Monorepo build and typecheck validations pass.
- **Known Issues**: None
- **Next Module**: M10 — Field Worker Operations

### Module: M10 — Field Worker Operations
- **Status**: Completed
- **Implemented**: Implemented start work and resolution submit endpoints on the backend, exported raw upload multer instances, and conditionally rendered repair taskboards and upload forms on the incident detail view for field workers.
- **Files Changed**:
  - [services/api/src/middleware/upload.ts](file:///home/fardeen/Documents/Projects/Civique/services/api/src/middleware/upload.ts)
  - [services/api/src/routes/incidents.ts](file:///home/fardeen/Documents/Projects/Civique/services/api/src/routes/incidents.ts)
  - [apps/web/app/admin/incidents/[id]/page.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/admin/incidents/[id]/page.tsx)
- **Database Changes**: None
- **API Changes**:
  - Added `POST /api/v1/incidents/:id/start` (marks status IN_PROGRESS and sets startedAt).
  - Added `POST /api/v1/incidents/:id/resolve` (uploads resolution after-photo, marks RESOLUTION_SUBMITTED, logs notes, and appends photoUrl).
- **Frontend Changes**:
  - Embedded a dedicated role-guarded task board console inside the incident detail page, showing "Start Repair" and "Submit Resolution" upload actions to field workers, and displaying submitted resolution evidence details.
- **Real-time Changes**: WS broadcast triggers on status transitions.
- **Tests**: Monorepo compiles clean and passes typecheck.
- **Known Issues**: None
- **Next Module**: M11 — SLA & Escalation

### Module: M11 — SLA & Escalation
- **Status**: Completed
- **Implemented**: Created background monitoring cron scheduler daemon, implemented dynamic assignee officer escalation rules, added manual SLA scanning path, and configured real-time updates.
- **Files Changed**:
  - [services/api/prisma/schema.prisma](file:///home/fardeen/Documents/Projects/Civique/services/api/prisma/schema.prisma)
  - [services/api/src/jobs/slaEscalation.ts](file:///home/fardeen/Documents/Projects/Civique/services/api/src/jobs/slaEscalation.ts)
  - [services/api/src/server.ts](file:///home/fardeen/Documents/Projects/Civique/services/api/src/server.ts)
  - [services/api/src/routes/incidents.ts](file:///home/fardeen/Documents/Projects/Civique/services/api/src/routes/incidents.ts)
- **Database Changes**: Added `isPublic` boolean field mapped to PostgreSQL.
- **API Changes**:
  - Added `POST /api/v1/incidents/sla-scan` (triggers a synchronous scan checking SLA breaches).
- **Frontend Changes**: WS updates synchronizes map coordinates instantly during escalation.
- **Real-time Changes**: WebSockets broadcast triggers on SLA escalation updates.
- **Tests**: Created E2E scan test verification script, Monorepo typechecking passes.
- **Known Issues**: None
- **Next Module**: M12 — Notifications System

### Module: M12 — Notifications System
- **Status**: Completed
- **Implemented**: Setup notifications table, built helper dispatcher utility emitting events through Socket.io private rooms, registered notification triggers for all core actions, created custom notification dropdown/panel component with real-time push toast alerts, and integrated bell in mobile and desktop layouts.
- **Files Changed**:
  - [services/api/prisma/schema.prisma](file:///home/fardeen/Documents/Projects/Civique/services/api/prisma/schema.prisma)
  - [services/api/src/utils/notifications.ts](file:///home/fardeen/Documents/Projects/Civique/services/api/src/utils/notifications.ts)
  - [services/api/src/utils/socket.ts](file:///home/fardeen/Documents/Projects/Civique/services/api/src/utils/socket.ts)
  - [services/api/src/routes/notifications.ts](file:///home/fardeen/Documents/Projects/Civique/services/api/src/routes/notifications.ts)
  - [services/api/src/app.ts](file:///home/fardeen/Documents/Projects/Civique/services/api/src/app.ts)
  - [services/api/src/routes/reports.ts](file:///home/fardeen/Documents/Projects/Civique/services/api/src/routes/reports.ts)
  - [services/api/src/routes/incidents.ts](file:///home/fardeen/Documents/Projects/Civique/services/api/src/routes/incidents.ts)
  - [services/api/src/jobs/slaEscalation.ts](file:///home/fardeen/Documents/Projects/Civique/services/api/src/jobs/slaEscalation.ts)
  - [apps/web/app/components/NotificationBell.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/components/NotificationBell.tsx)
  - [apps/web/app/admin/layout.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/admin/layout.tsx)
- **Database Changes**: Added `notifications` relation schema mappings.
- **API Changes**:
  - Added `GET /api/v1/notifications` (lists in-app notifications).
  - Added `POST /api/v1/notifications/:id/read` (marks single notification as read).
  - Added `POST /api/v1/notifications/read-all` (marks all notifications as read).
- **Frontend Changes**: Integrated interactive clickable `NotificationBell` in mobile header and desktop topbar with live update states and hot-toast alert redirection logic.
- **Real-time Changes**: WS broadcast triggers on personal `notification:received` events.
- **Tests**: Created database verification test script, Monorepo typechecking passes.
- **Known Issues**: None
- **Next Module**: M13 — AI Classification System

### Module: M12.5 — Premium UI/UX & Legibility Redesign
- **Status**: Completed
- **Implemented**: Overhauled fonts and sizing system to resolve legibility issues; implemented a unified pulsing LoadingState component and applied responsive mobile layouts to citizen forms and live maps.
- **Files Changed**:
  - [apps/web/app/globals.css](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/globals.css)
  - [apps/web/app/components/Sidebar.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/components/Sidebar.tsx)
  - [apps/web/app/components/Shell.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/components/Shell.tsx)
  - [apps/web/app/components/NotificationBell.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/components/NotificationBell.tsx)
  - [apps/web/app/components/LoadingState.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/components/LoadingState.tsx)
  - [apps/web/app/page.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/page.tsx)
  - [apps/web/app/report/page.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/report/page.tsx)
  - [apps/web/app/map/page.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/map/page.tsx)
  - [apps/web/app/admin/page.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/admin/page.tsx)
  - [apps/web/app/admin/incidents/[id]/page.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/admin/incidents/[id]/page.tsx)
- **Database Changes**: None
- **API Changes**: None
- **Frontend Changes**:
  - Replaced native loading checks and tailwind spinners with custom brand pulsing logo loader.
  - Scaled up font-size tags from tiny sizes to highly visible sizes across all roles and user interfaces.
  - Optimized form inputs, category tiles, geofencing map pin offsets, and detail drawer overlays for mobile viewport responsiveness.
- **Real-time Changes**: None
- **Tests**: Monorepo build and typecheck validations pass.
- **Known Issues**: None
- **Next Module**: M13 — AI Classification System

### Module: M12.6 — Manrope Font & High Visibility UI Redesign
- **Status**: Completed
- **Implemented**: Swapped system-wide font configuration for Manrope loaded from Google Fonts; redesigned form card panels with clean header bands (`bg-[#faf9f6]`, `border-b`) and strong mahogany labels; scaled up text weights and colors to high-contrast values.
- **Files Changed**:
  - [apps/web/app/layout.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/layout.tsx)
  - [apps/web/app/globals.css](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/globals.css)
  - [apps/web/app/report/page.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/report/page.tsx)
  - [apps/web/app/page.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/page.tsx)
  - [apps/web/app/map/page.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/map/page.tsx)
  - [apps/web/app/admin/page.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/admin/page.tsx)
  - [apps/web/app/admin/incidents/[id]/page.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/admin/incidents/[id]/page.tsx)
- **Database Changes**: None
- **API Changes**: None
- **Frontend Changes**:
  - Replaced thin Poppins weights with sturdy Manrope `font-normal`/`font-medium`/`font-bold` configurations.
  - Form sections wrapped in visually well-defined card elements with separate top headers and bottom action bars.
  - Labels and descriptions are updated to high-contrast colors (`#2B2523`) for maximum legibility.
- **Real-time Changes**: None
- **Tests**: Monorepo typecheck validation passed clean.
- **Known Issues**: None
- **Next Module**: M13 — AI Classification System

### Module: M12.7 — Detailed Timeline Tracker & Rich Citizen Profile
- **Status**: Completed
- **Implemented**: Overhauled the citizen case details page with a premium vertical progress tracker mapping submissions to active crew dispatches, assigned field workers, and target departments. Redesigned the citizen profile with interactive identity credentials, phone lines, ward selection dropdowns, and push alert triggers.
- **Files Changed**:
  - [services/api/src/routes/reports.ts](file:///home/fardeen/Documents/Projects/Civique/services/api/src/routes/reports.ts)
  - [apps/web/app/report/[id]/page.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/report/[id]/page.tsx)
  - [apps/web/app/profile/page.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/profile/page.tsx)
- **Database Changes**: None
- **API Changes**:
  - Extended GET `/reports/:id` and GET `/reports` responses to manually fetch and attach `incident.worker`, `incident.assignee` and `incident.department` objects without breaking constraints.
- **Frontend Changes**:
  - Overhauled case details layout to display a vertical 5-step timeline (Submission Received, Grievance Boundary Verification, Crew Dispatch & Assignment, Repairs In Progress, Resolution Verified) with corresponding dates and dynamic content.
  - Implemented interactive forms on the profile settings tab for Name, Phone, and Ward limits, along with toggles for SMS, Email, and SLA alert preferences.
- **Real-time Changes**: None
- **Tests**: Checked compiling and verified typechecks build clean.
- **Known Issues**: None
- **Next Module**: M13 — AI Classification System

### Module: M12.8 — Citizen Dashboard Dynamic Portal & Sidebar Integration
- **Status**: Completed
- **Implemented**: Connected the citizen profile page to the navigation menu sidebar; enabled dynamic API fetches on the citizen dashboard home page to query and display real citizen reports list, counts, and recent timeline updates.
- **Files Changed**:
  - [apps/web/app/components/Sidebar.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/components/Sidebar.tsx)
  - [apps/web/app/page.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/page.tsx)
- **Database Changes**: None
- **API Changes**: None
- **Frontend Changes**:
  - Added a dedicated "My Reports" option to the citizen sidebar routing to `/profile`.
  - Configured the sidebar footer settings link to point to `/profile` for citizens, while maintaining `/admin/settings` for administrators.
  - Rewrote the citizen home dashboard page to fetch from `GET /api/v1/reports` and display real metrics count.
  - Rendered a list of the 3 most recent reported updates in the neighborhood feed with direct clickable links leading to their timeline views (`/report/[id]`).
- **Real-time Changes**: None
- **Tests**: Checked compiling and verified typechecks build clean.
- **Known Issues**: None
- **Next Module**: M13 — AI Classification System

### Module: M12.9 — Persistent Navigation Sidebar Consistency Redesign
- **Status**: Completed
- **Implemented**: Wrapped the profile dashboard page and the individual case timeline details page inside the standard Shell layout, ensuring the navigation sidebar remains persistently visible.
- **Files Changed**:
  - [apps/web/app/profile/page.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/profile/page.tsx)
  - [apps/web/app/report/[id]/page.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/report/[id]/page.tsx)
- **Database Changes**: None
- **API Changes**: None
- **Frontend Changes**:
  - Removed manual `CitizenHeader` top nav declarations.
  - Wrapped content inside the `<Shell>` layout structure to persist the left-side global sidebar navigation.
  - Aligned page gutters, padding, and animations with home, submit form, and map dashboards.
- **Real-time Changes**: None
- **Tests**: Monorepo typechecks pass successfully.
- **Known Issues**: None
- **Next Module**: M13 — AI Classification System

### Module: M12.10 — Quick Profile Header Shortcut & Bento Grid Widening
- **Status**: Completed
- **Implemented**: Restored the sidebar color palette to brand mahogany (`bg-[#351008]`) with terracotta active highlights (`bg-[#EF6820]`); made the header initials avatar clickable pointing to `/profile` (if citizen); expanded the main workspace container widths to `max-w-7xl` and split the layouts into dual-column bento grids.
- **Files Changed**:
  - [apps/web/app/components/Sidebar.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/components/Sidebar.tsx)
  - [apps/web/app/components/Shell.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/components/Shell.tsx)
  - [apps/web/app/page.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/page.tsx)
  - [apps/web/app/report/page.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/report/page.tsx)
  - [apps/web/app/profile/page.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/profile/page.tsx)
  - [apps/web/app/report/[id]/page.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/report/[id]/page.tsx)
- **Database Changes**: None
- **API Changes**: None
- **Frontend Changes**:
  - Restored rich brown color palette to global Sidebar with sand texts and terracotta active badges.
  - Linked top-right header initials avatar to profile options with responsive hover states and pulsing green active indicator.
  - Scaled workspace widths to `max-w-7xl` to fill widescreen monitors.
  - Splitted the citizen dashboard into a dual-column bento grid (Left: contribution counters, recent reports; Right: AI alerts, geofence area, and a new Indore Ward Helpline Directory card).
- **Real-time Changes**: None
- **Tests**: Monorepo static compilation checks succeed clean.
- **Known Issues**: None
- **Next Module**: M13 — AI Classification System

### Module: M13 — AI Classification
- **Status**: Completed
- **Implemented**: Created pretrained MobileNetV2 model route in Python FastAPI service, later upgraded to a dedicated `CivicClassifier` class wrapping ConvNeXt-Tiny architecture. Implemented description-based keyword matcher fallbacks if custom weights are missing (returning status: "unavailable"). Modified Express API report route to synchronously request category classification, saving confidence scores, model versions, and top predictions list. Implemented a background retry daemon to resolve pending submissions offline with a 15-second Prisma transaction timeout. Decoupled and built the reusable `CiviqueAIVerification` frontend component supporting progressive states. Integrated smart category suggestions, card highlights, badges, and confirmation triggers.
- **Files Changed**:
  - [services/ml/requirements.txt](file:///home/fardeen/Documents/Projects/Civique/services/ml/requirements.txt)
  - [services/ml/app/classifier.py](file:///home/fardeen/Documents/Projects/Civique/services/ml/app/classifier.py)
  - [services/ml/app/main.py](file:///home/fardeen/Documents/Projects/Civique/services/ml/app/main.py)
  - [services/api/src/utils/ml.ts](file:///home/fardeen/Documents/Projects/Civique/services/api/src/utils/ml.ts)
  - [services/api/src/routes/reports.ts](file:///home/fardeen/Documents/Projects/Civique/services/api/src/routes/reports.ts)
  - [services/api/src/jobs/mlRetry.ts](file:///home/fardeen/Documents/Projects/Civique/services/api/src/jobs/mlRetry.ts)
  - [services/api/src/server.ts](file:///home/fardeen/Documents/Projects/Civique/services/api/src/server.ts)
  - [apps/web/app/report/page.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/report/page.tsx)
  - [apps/web/app/components/CiviqueAIVerification.tsx](file:///home/fardeen/Documents/Projects/Civique/apps/web/app/components/CiviqueAIVerification.tsx)
- **Database Changes**: None
- **API Changes**:
  - FastAPI: Added `POST /api/v1/classify/category` returning category, confidence, top predictions list, and model version.
  - Express REST API: Integrated AI classification updates inside `POST /api/v1/reports`, added `/api/v1/reports/classify-draft` returning model version and top predictions parameters.
- **Frontend Changes**:
  - Expanded category grid with 7 new categories.
  - Implemented real-time classification call instantly on image upload with visual AI loader and confidence score badge.
  - Extracted the reusable `CiviqueAIVerification` component to render loading, success, warning, pending review, and offline fallback statuses.
  - Added Suggestion Confirmation Banner in Step 2, dynamic highlighted cards, and AI Suggestion confidence badges on recommended tiles.
- **Real-time Changes**: WebSockets broadcast triggers on retry updates.
- **Tests**: Created Python and Node.js scratch tests verifying classification, database transaction retry loops, and timeout limits.
- **Known Issues**: None
- **Next Module**: M14 — Duplicate Detection
