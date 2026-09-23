# Civique UI Transformation Implementation Plan

> **Document role:** Detailed screen, interaction, responsive, accessibility, and component companion to the authoritative [`../Implementation.md`](../Implementation.md). Product behavior, module scope, and current status come from the master specification and [`ACCEPTANCE_MATRIX.md`](ACCEPTANCE_MATRIX.md).

> **Current design decision:** Preserve and extend the implemented Dark Green Pro system. Historical Cloudflare-theme references below describe the origin of the token work; they do not authorize another brand redesign.

**Status:** Partially implemented; verification and expansion remain

**Program:** UX0–UX14 companion program
**Product:** Civique  
**Design direction:** Exact TweakCN Cloudflare theme `cmqx9le2j000504l49jgxe1d0`  
**Primary constraint:** Preserve all working business functionality, routes, APIs, authorization, real-time behavior, and data contracts.

---

## 1. Purpose

This plan defines how the current Civique frontend will be replaced with a cohesive, production-oriented user experience without changing the platform's working behavior.

The redesign is not a backend rewrite. It is a controlled frontend migration that must make the civic workflow understandable from the first screen:

1. A citizen sees an issue and reports it.
2. Civique validates the evidence and gives the citizen a tracking reference.
3. Municipal staff triage and route the resulting incident.
4. A field worker performs the work and submits evidence.
5. Civique verifies the evidence and asks the citizen to confirm or dispute.
6. The result remains visible through appropriate public accountability views.

The new interface must feel trustworthy, responsive, deliberate, and distinctly civic. It must not look like a collection of unrelated dashboard templates.

## 2. Non-Negotiable Scope Rules

### 2.1 Must remain unchanged unless separately approved

- Existing public URLs and route meanings.
- `/api/v1` endpoint paths, request payloads, and response contracts.
- Authentication and session behavior.
- Backend-enforced RBAC and object-level scope rules.
- Report creation, upload, geofencing, incident creation, assignment, state transitions, and resolution submission.
- Notification and Socket.IO event behavior.
- Leaflet map behavior and privacy-safe public incident DTOs.
- Groq/Qwen provider decisions and the asynchronous AI boundary.
- Database schema and migrations.

### 2.2 What will change

- Visual theme, typography, spacing, surfaces, icons, and interaction styling.
- Page composition and information hierarchy.
- Navigation architecture for each role.
- Repeated raw controls replaced with tested design-system components.
- Loading, empty, error, success, retry, modal, toast, and notification presentation.
- Citizen reporting flow presentation, while retaining the existing submission contract.
- Admin and field-worker task presentation, while retaining authorization and mutations.

### 2.3 Migration safety

The existing UI will not be deleted in one destructive operation. Each workflow will be replaced page-by-page, tested against the old behavior, and accepted before obsolete styles or components are removed. This is the only safe interpretation of “redesign from scratch” that also guarantees “functionality works as it is now.”

## 3. Current Frontend Audit

### 3.1 Existing stack

- Next.js 16.3.1 App Router.
- React 19.2.8.
- Tailwind CSS 4.
- Leaflet 1.9 for maps.
- Socket.IO client for real-time updates.
- `react-hot-toast` for notifications.
- `react-icons` for icons.
- Manrope loaded through `next/font/google`.

### 3.2 Existing routes to preserve

- `/` — role-aware home/dashboard.
- `/signin` — sign in.
- `/signup` — citizen registration.
- `/report` — create a report.
- `/report/[id]` — citizen report detail and timeline.
- `/map` — public/citizen live map.
- `/profile` — citizen reports and profile.
- `/admin` — municipal overview.
- `/admin/incidents` — incident directory.
- `/admin/incidents/[id]` — incident operations.
- `/admin/reports` — raw report directory.
- `/admin/people` — people and role management surface.
- `/admin/analytics` — analytics surface.
- `/admin/settings` — municipal settings surface.

### 3.3 Current design problems

- Colors are hard-coded repeatedly across pages instead of using semantic tokens.
- Burgundy, cream, terracotta, and one-off neutral values are mixed with custom `premium-*` classes.
- Buttons, fields, cards, drawers, dropdowns, badges, and empty states are rebuilt per page.
- There is no `components.json` and no canonical shadcn component layer.
- Navigation does not consistently explain the current role, geographic scope, or next action.
- Citizen, official, and field-worker experiences share structures even when their task priorities differ.
- Some controls are visual placeholders or no-ops; these must be connected, explicitly disabled, or removed from the active workflow.
- Loading and empty states often dominate the screen without explaining recovery or the next useful action.
- Status names are shown as implementation enum values in places rather than clear civic language.
- The map, list, and incident detail views do not form one obvious investigation workflow.
- Mobile navigation and desktop navigation are not governed by one information architecture.
- Current UI files still use browser `localStorage` authentication patterns that the corrected M2 architecture plans to remove. The redesign must not deepen that dependency.

## 4. Target Experience Principles

### 4.1 Task-first

Every role lands on the work they most likely need to perform now. The primary action is visually obvious, while secondary tools remain accessible without competing for attention.

### 4.2 Trust through evidence

The interface must consistently show:

- What happened.
- When it happened.
- Who or which department owns the next step.
- What evidence exists.
- What the current SLA state is.
- What the citizen or operator can do next.

### 4.3 Progressive disclosure

Summary views show only decision-making information. Detailed evidence, audit history, AI signals, assignment metadata, and advanced filters open through details, tabs, drawers, or expandable regions.

### 4.4 Role-aware, not role-colored

All roles use one Civique design language. Roles differ through navigation, available actions, scope labels, and information density—not through unrelated themes.

### 4.5 Honest system state

The interface must never imply that an action succeeded before the API confirms it. AI suggestions must be labeled advisory. Unavailable channels or unfinished features must be shown as unavailable, not as working toggles.

### 4.6 Accessible by default

Keyboard behavior, focus visibility, contrast, semantic labels, touch targets, reduced motion, and screen-reader announcements are part of component acceptance—not later polish.

## 5. Exact Cloudflare Theme Adoption

The supplied TweakCN source is the source of truth for the base visual tokens. The implementation must import or reproduce its values exactly before adding Civique-specific semantic aliases.

### 5.1 Core light theme

- App background, cards, and popovers: `oklch(1 0 0)`.
- Main foreground: `oklch(0 0 0)`.
- Primary orange: `oklch(0.7163 0.1706 53.4464)`.
- Secondary near-black navy: `oklch(0.1607 0.0367 261.0427)`.
- Muted surface: `oklch(0.9642 0 0)`.
- Muted foreground: `oklch(0.5103 0 0)`.
- Border and input: `oklch(0.8853 0 0)`.
- Destructive: `oklch(0.5653 0.2133 27.5428)`.
- Sidebar surface: `oklch(0.9846 0.0017 247.8389)`.
- Sidebar foreground: `oklch(0.2101 0.0318 264.6645)`.

### 5.2 Core dark theme

- App and sidebar background: `oklch(0.1776 0 0)`.
- Card and popover: `oklch(0.2264 0 0)`.
- Main foreground: `oklch(0.9846 0.0017 247.8389)`.
- Primary orange: `oklch(0.7235 0.1724 53.7949)`.
- Muted surface: `oklch(0.2686 0 0)`.
- Border and input: `oklch(0.2739 0.0055 286.0326)`.

### 5.3 Shape, spacing, and elevation

- Base radius: `0.25rem`.
- Use the exact supplied radius calculations for `sm`, `md`, `lg`, and `xl`.
- Use the supplied compact shadow scale; avoid oversized soft “AI dashboard” shadows.
- Use one-pixel borders for structure and shadows only for floating or elevated content.
- Base spacing unit remains `0.25rem`.
- Global tracking remains `-0.01em`.

### 5.4 Typography

- Primary UI font: Inter.
- Monospace data font: Fira Code, with the supplied fallbacks.
- Serif fallback: Georgia; it is not a default UI display font.
- Replace Manrope globally only after Inter is installed and visual regression baselines exist.
- Prefer locally bundled/self-hosted font files through `next/font/local` so production rendering does not depend on a runtime font CDN.
- Use Fira Code only for tracking IDs, hashes, coordinates, timestamps where alignment helps, and technical identifiers.

### 5.5 Civique semantic extensions

The Cloudflare preset controls brand and surfaces. Civique additionally needs semantic lifecycle tokens that remain distinguishable in light and dark themes:

- Informational/report received.
- AI review/pending.
- Open/acknowledged.
- Assigned/in progress.
- Resolution submitted/verification.
- Resolved/success.
- Escalated/warning.
- Rejected/destructive.
- Disputed/reopened.
- Priority low, medium, high, and critical.

These tokens must not replace `primary`. They must be tested for contrast and used consistently by `StatusBadge`, `PriorityBadge`, timelines, maps, charts, and filters.

### 5.6 Branding and logo

- Keep the product name **Civique**.
- Create one primary wordmark, one compact mark, one monochrome mark, and an app icon.
- The identity should combine civic clarity with the Cloudflare orange/ink palette; it must not copy Cloudflare’s corporate logo.
- Use SVG for interface marks and PNG only for required raster surfaces.
- Define minimum sizes, clear space, light/dark variants, and accessible alt text.
- Logo asset design is a separate reviewed deliverable inside UX0; no generated logo replaces the existing asset without approval.

## 6. shadcn and TweakCN Integration Strategy

### 6.1 Verified CLI approach

Civique is an existing Next.js app inside an npm workspace. The controlled setup sequence is:

```bash
cd apps/web
npx shadcn@latest init
npx shadcn@latest add https://tweakcn.com/r/themes/cmqx9le2j000504l49jgxe1d0
```

The command in the request contained `npx shadcn@latest add` twice; only one `add` invocation is required. Before running either command, UX0 must capture the current files and inspect the CLI diff because registry items can update CSS or configuration.

If execution from the repository root is preferred, use the CLI configuration option for `apps/web` only after verifying it against the installed CLI version. Commands that download packages require explicit approval if they need network access.

### 6.2 Expected configuration

- Add `apps/web/components.json`.
- Enable React Server Components.
- Enable CSS-variable theming.
- Point the Tailwind CSS entry to `app/globals.css`.
- Preserve the existing `@/*` TypeScript alias.
- Generate primitives into `apps/web/components/ui`.
- Keep Civique composites in `apps/web/components/civique` or feature folders.
- Add only required components, not the full registry.

### 6.3 CSS migration rules

- Preserve `@import "tailwindcss"` and Tailwind v4 syntax.
- Preserve Leaflet’s stylesheet import and map container sizing.
- Install the exact preset tokens in `:root`, `.dark`, and `@theme inline`.
- Add Civique status and priority aliases in a separate documented section.
- Stop adding hex/OKLCH literals directly to page components after UX0.
- Keep old `.premium-*` styles temporarily only while unmigrated pages still use them.
- Delete legacy variables and classes only after `rg` confirms zero consumers and visual tests pass.

### 6.4 Dependency policy

- Review every package proposed by shadcn before accepting it.
- Prefer shadcn’s current supported primitives and Lucide icons for one consistent icon language.
- Avoid installing multiple libraries for the same component category.
- Keep Leaflet unless a separate map-engine change is approved.
- Replace `react-hot-toast` only after the new toast system covers all existing call sites and accessibility behavior.

## 7. Target Frontend Architecture

### 7.1 Directory responsibilities

```text
apps/web/
  app/                       Route entry points; preserve public URLs
  components/
    ui/                      shadcn primitives, minimally customized
    civique/                 Cross-feature domain components
    maps/                    Map canvas, markers, clusters, overlays, legends
  features/
    auth/                    Sign-in, registration, session UI
    reporting/               Report wizard and evidence flow
    incidents/               Cards, tables, detail, lifecycle actions
    operations/              Assignment, routing, SLA, worker tasks
    notifications/           Bell, center, preferences, real-time adapter
    profile/                 Account and report history
    analytics/               Metrics and accessible charts
  lib/
    api/                     Typed API client and error normalization
    auth/                    Session state and authorization helpers
    realtime/                Socket adapter and reconciliation
    design/                  Status/priority/category presentation maps
    utils.ts                 Shared class composition and utilities
  hooks/                     Reusable UI/data hooks
```

Route groups may be introduced to organize public, auth, citizen, and operations layouts, but they must not alter URLs.

### 7.2 State boundaries

- Server components render stable page structure where practical.
- Client components own browser APIs, map rendering, uploads, toasts, dialogs, and sockets.
- Network code is removed from visual primitives.
- Each feature uses typed DTOs matching the API, with no new `any` in touched code.
- Authentication is consumed through one session boundary rather than repeated direct `localStorage` reads.
- Socket updates reconcile with API state and do not become the sole source of truth.

## 8. Design-System Component Inventory

### 8.1 Foundational primitives

UX0 must establish and document these primitives before page migration:

- Button and button group.
- Input, input group, textarea, label, field, and form message.
- Select, combobox, checkbox, radio group, and switch.
- Card, item, separator, and scroll area.
- Badge and accessible status indicator.
- Alert and alert dialog.
- Dialog, sheet, drawer, popover, dropdown menu, and tooltip.
- Tabs, accordion, breadcrumb, pagination, and command menu.
- Table and data-table building blocks.
- Avatar.
- Skeleton, spinner, progress, and loading overlay.
- Toast/sonner-style notification surface.
- Empty state and error state.

### 8.2 Civique domain components

- `CiviqueLogo` — approved marks and variants.
- `AppShell` — shared responsive frame.
- `RoleSidebar` — scope-aware desktop navigation.
- `MobileNavigation` — task-first mobile navigation.
- `TopBar` — page context, search, notifications, account.
- `PageHeader` — title, description, breadcrumbs, primary action.
- `ScopeBadge` — current city/zone/ward/department.
- `StatusBadge` — human-readable incident lifecycle.
- `PriorityBadge` — numeric and named priority.
- `IncidentCard` — mobile/list summary.
- `IncidentDataTable` — official queue.
- `IncidentSummary` — key facts and next action.
- `IncidentTimeline` — complete lifecycle and evidence events.
- `SLAIndicator` — deadline, breach level, and ownership.
- `EvidenceGallery` — safe before/after viewing.
- `EvidenceUploader` — validation, preview, progress, retry.
- `LocationPicker` — geolocation, manual correction, ward result.
- `ReportWizard` — step state, validation, save/submit behavior.
- `AssignmentDialog` — department/worker selection with scope messaging.
- `TransitionAction` — allowed lifecycle action with confirmation.
- `AIAdvisoryCard` — model suggestion, confidence, provenance summary, override.
- `MapShell` — map/list split, filters, drawer, and legend.
- `MapMarker` and `MarkerCluster` — accessible visual encoding.
- `NotificationCenter` — durable list, unread state, actions.
- `MetricCard` — value, context, trend, freshness.
- `FilterBar` — URL-backed filters and reset.
- `DataState` — loading, empty, error, retry, and stale states.

## 9. Information Architecture by Role

### 9.1 Anonymous/public user

Primary navigation:

- Home.
- Explore map.
- Track a report.
- How Civique works.
- Sign in.
- Report an issue.

The public experience explains privacy, the report-to-resolution process, service coverage, and public accountability without exposing citizen identity.

### 9.2 Citizen

Primary navigation:

- Home.
- Report issue.
- My reports.
- Explore map.
- Notifications.
- Profile and preferences.

Home prioritizes “Report an issue,” current report progress, actions requiring confirmation, and nearby public issues. It must not resemble an administrative dashboard.

### 9.3 Field worker

Primary navigation:

- Today.
- Assigned.
- In progress.
- Submitted.
- Work map.
- Notifications.
- Profile.

This experience is mobile-first and optimized for starting work, navigating to the location, reviewing evidence, capturing after-evidence, and submitting resolution notes.

### 9.4 Ward officer

Primary navigation:

- Overview.
- Triage queue.
- Incidents.
- Reports.
- Live map.
- SLA and escalations.
- People in scope.

The current ward scope must be visible. If a special demo account is temporarily city-wide, the expanded scope must be explicit in the UI and remain backend-controlled.

### 9.5 Department head

Primary navigation:

- Department overview.
- Unassigned queue.
- Active work.
- Field workers.
- SLA performance.
- Routing view.
- Notifications.

### 9.6 Zonal officer

Primary navigation:

- Zone overview.
- Escalations.
- Ward comparison.
- Incidents.
- Map.
- Departments.

### 9.7 Commissioner

Primary navigation:

- City overview.
- Critical incidents.
- Escalations.
- Department performance.
- Ward performance.
- Public accountability.

### 9.8 City admin

Primary navigation:

- City configuration.
- Geography.
- Departments and categories.
- Routing rules.
- SLA policies.
- Users and roles.
- System health.

### 9.9 Super admin

Primary navigation:

- Platform overview.
- Cities/tenants.
- Global users.
- Global configuration.
- Security/audit.
- Service health.

Only items backed by working APIs are actionable. Future items are omitted or clearly labeled unavailable; they are never presented as functional controls.

## 10. End-to-End UX Flows

### 10.1 Citizen report flow

The report experience becomes a guided four-stage wizard:

1. **Add evidence**
   - Camera/upload choice.
   - File safety rules and privacy guidance before selection.
   - Preview, replace, and validation status.
   - AI analysis runs asynchronously and never blocks continuing.

2. **Describe the issue**
   - Category selector with icons and plain-language examples.
   - Description field with useful guidance.
   - AI category suggestion shown as advisory with accept/override.
   - No invented success state when AI is pending or unavailable.

3. **Confirm location**
   - Request current location with a clear permission explanation.
   - Map pin preview and manual correction.
   - Resolved ward/service-area result.
   - Explicit out-of-service guidance.

4. **Review and submit**
   - Evidence, category, description, location, privacy, and contact summary.
   - Edit links return to the relevant step without losing input.
   - Submit button prevents duplicates while pending.
   - Success state shows tracking ID, next expected step, and share/copy actions.

### 10.2 Citizen tracking flow

- “My reports” separates action required, active, and resolved reports.
- Each report card shows status in plain language, latest update, department/owner when public to the citizen, and next expected step.
- Report detail begins with one clear status summary and the next citizen action.
- The timeline shows actual recorded events rather than a hard-coded five-step fiction.
- Citizen confirmation/dispute appears only when the backend permits it.

### 10.3 Official triage flow

- Queue opens with role and geographic scope visible.
- Saved/default filters prioritize unacknowledged, unassigned, escalated, or SLA-risk work.
- Selecting a row opens a detail route or responsive drawer without losing filters.
- Detail presents issue evidence, map, duplicate context, AI advisory, assignment, SLA, and history in decision order.
- Only valid state-machine actions are shown.
- Mutations require confirmation where consequential, show in-progress state, and refresh from the API after success.

### 10.4 Field-worker resolution flow

- “Today” shows assigned work ordered by urgency and travel context.
- Opening a task shows location, citizen-safe evidence, instructions, SLA, and contact policy.
- “Start work” is a single deliberate action with server confirmation.
- Resolution submission requires after-evidence and notes, with upload progress and retry.
- After submission, the task explains that verification/citizen confirmation remains; it does not claim final resolution.

### 10.5 Map-to-detail flow

- Map always has a visible loading/error state and a working tile attribution region.
- Desktop uses a filter/list panel plus map canvas.
- Mobile uses the map with a bottom sheet and a full accessible list alternative.
- Selecting a marker and selecting a list item produce the same detail state.
- Filters are reflected in the URL where practical, have counts, and offer one-click reset.
- Empty results distinguish “no incidents in this area” from API, authentication, or map-tile failures.

## 11. Page Redesign Specifications

### 11.1 Public landing page

- Clear promise: report, track, and verify civic resolution.
- Primary “Report an issue” and secondary “Explore live map” actions.
- Short evidence-based workflow explanation.
- Trust section covering public tracking, privacy, and proof of resolution.
- Live but privacy-safe city activity summary only when backed by an API.
- Responsive civic footer with service/help links.

### 11.2 Sign-in and registration

- One focused auth card with clear hierarchy.
- Password visibility, validation, disabled/pending state, and useful API errors.
- Registration clearly states that public sign-up creates a Citizen account.
- Privileged-role provisioning is never offered in public registration.
- Responsive layout that does not make decorative content compete with the form.

### 11.3 Citizen home

- Greeting and location/scope context.
- Prominent report action.
- Action-required report card if citizen confirmation/dispute is pending.
- Current report progress.
- Nearby public issues/map preview.
- Recent notifications.
- No administrative metrics that do not help the citizen act.

### 11.4 Report creation

- Implement the four-stage wizard in section 10.1.
- Preserve the existing multipart API and idempotency behavior.
- Autosave is not claimed unless a real draft API or safe local draft strategy is approved.

### 11.5 My reports/profile

- Separate report history from identity/preferences using tabs or sub-navigation.
- Use searchable/filterable report cards with pagination as data grows.
- Only show notification channel toggles that are actually supported.
- Profile mutation controls remain disabled or absent until backed by APIs.

### 11.6 Report detail

- Status/next-action hero.
- Incident and report distinction explained where both exist.
- Actual lifecycle timeline.
- Evidence gallery.
- Location and ward summary.
- Assignment/department summary when allowed.
- Citizen confirmation/dispute action when valid.
- Technical identifiers visually secondary but copyable.

### 11.7 Live map

- Fix map container sizing and tile/error diagnosis as part of page acceptance.
- Desktop split view and mobile bottom-sheet view.
- Search, status, category, date, and location filters supported only where APIs support them.
- Clustered markers and a non-map list alternative.
- Privacy-safe detail preview.
- Real-time update indicator and stale/reconnect state.

### 11.8 Municipal overview

- Role and scope header.
- Work queue summary before decorative metrics.
- Open, unassigned, SLA risk, escalated, and resolved-today metrics from real data only.
- Priority queue and recent activity.
- Compact live map preview.
- Freshness timestamp and reconnect state.

### 11.9 Incidents directory

- Server-backed filtering, sorting, pagination, and clear filter chips.
- Desktop data table; mobile incident cards.
- Status, priority, ward, department, assignee, SLA, and updated time.
- Bulk actions only if authorized backend endpoints exist.
- Empty state respects active filters and offers reset.

### 11.10 Incident operations detail

- Summary and next valid action first.
- Evidence, location, routing, SLA, AI advisory, linked reports, and audit history organized into sections/tabs.
- Assignment dialog validates available departments/workers and displays scope.
- State transitions expose only state-machine-valid actions.
- High-impact actions use an alert dialog and show the consequence.
- Socket updates reconcile without erasing in-progress form state.

### 11.11 Reports directory

- Clearly represent raw submissions separately from incidents.
- Show linked/unlinked/duplicate/rejected processing state.
- Protect citizen identity and private evidence according to role.
- Provide a path to the associated incident when authorized.

### 11.12 People, settings, and analytics

- Remove or disable mock/no-op controls during migration.
- People shows only users within backend-authorized scope.
- Settings pages are grouped by actual persisted configuration.
- Analytics is labeled as limited until M18 provides real aggregates.
- Charts must have accessible text/table equivalents and freshness metadata.

## 12. Feedback and Interaction Standards

### 12.1 Toasts

- Success: brief confirmation with the affected entity and optional “View” action.
- Error: concise user message with retry when safe; never show stack traces.
- Warning: used for recoverable risk, pending verification, or offline state.
- Loading toast: only for operations that continue across navigation; otherwise use local pending state.
- Duplicate toasts for one operation are prevented.
- Toasts are announced through an accessible live region and do not trap focus.

### 12.2 Dialogs, sheets, and drawers

- Dialog for focused desktop decisions.
- Alert dialog for destructive or consequential actions.
- Sheet for supporting detail and filters.
- Drawer/bottom sheet for mobile task continuation.
- All overlays have labelled titles, descriptions, focus trapping, Escape behavior, and focus restoration.

### 12.3 Forms

- Persistent visible labels; placeholders are examples, not labels.
- Required/optional state is explicit.
- Validation appears next to the field and in an error summary for long forms.
- Submit state prevents accidental duplicate requests.
- Server errors map to actionable field/global messages.
- Unsaved form protection is used where leaving would lose significant work.

### 12.4 Loading, empty, error, and stale states

Every data surface must implement:

- Initial skeleton.
- Local mutation progress.
- Empty state with reason and relevant action.
- Error state with safe retry.
- Offline/reconnecting state where sockets or maps are involved.
- Stale-data indicator when cached content remains visible.

## 13. Responsive Standards

### 13.1 Breakpoint intent

- Citizen and field-worker flows start at narrow mobile widths.
- Official dashboards start with desktop information density but remain usable on tablet/mobile.
- Public pages support both mobile and desktop equally.

### 13.2 Mobile rules

- Minimum touch target of 44 by 44 CSS pixels.
- Primary actions remain reachable without horizontal scrolling.
- Tables become cards or controlled horizontal regions with labelled columns.
- Filters open in a drawer and show active-filter count.
- Map controls do not overlap browser chrome or the mobile navigation.
- Evidence capture supports the camera and gallery without tiny controls.

### 13.3 Desktop rules

- Sidebar can collapse without losing accessible labels.
- Content width follows task type: constrained for forms, wider for queues/maps.
- Sticky headers/actions must not hide focused controls.
- Dense tables preserve readable row height and keyboard focus.

## 14. Accessibility Acceptance

- Target WCAG 2.2 AA for redesigned workflows.
- Complete keyboard navigation for sidebar, menus, dialogs, forms, tables, filters, and maps’ list alternative.
- Visible Cloudflare-orange-compatible focus ring on every interactive control.
- Color is never the only status indicator.
- Form errors are programmatically associated with fields.
- Async results and toasts use appropriate live regions.
- Images have meaningful alt text or are explicitly decorative.
- Motion respects `prefers-reduced-motion`.
- Light and dark themes pass contrast checks for text, icons, borders needed for comprehension, and status tokens.

## 15. Functionality Preservation Contract

Before a route is redesigned, record its behavior as a route contract:

- Who can access it.
- Which endpoint(s) it calls.
- Request method, parameters, body, and multipart fields.
- Loading, empty, error, and success behavior.
- Mutations and expected state transitions.
- Socket events consumed.
- Navigation destinations.
- Responsive behavior.

After redesign, the same contract must pass. A visually complete page is not accepted if it loses API calls, permissions, uploads, map behavior, real-time updates, or valid transitions.

## 16. UI Transformation Modules

### UX0 — Design Foundation and Safety Baseline

**Goal:** Install the exact Cloudflare visual foundation and establish a testable component system without redesigning feature pages.

**Deliverables:**

- Capture route/functionality inventory and baseline screenshots.
- Add shadcn configuration for the existing Next.js/Tailwind v4 workspace.
- Apply the exact TweakCN Cloudflare tokens.
- Add deterministic Inter and Fira Code font assets/configuration.
- Add class composition utility and selected foundational dependencies.
- Establish `components/ui` and `components/civique` boundaries.
- Build Button, Input, Textarea, Select, Card, Badge, Alert, Dialog, Sheet, Skeleton, Spinner, Toast, EmptyState, ErrorState, StatusBadge, and PriorityBadge.
- Build a design-system preview route available only in development, or component tests if a preview route is undesirable.
- Define logo requirements and prepare reviewed variants; do not silently replace branding.
- Keep legacy CSS available for unmigrated pages.

**Tests:**

- Typecheck, lint, and production build.
- Component keyboard and accessible-name tests.
- Light/dark contrast review.
- Snapshot/visual checks at mobile, tablet, and desktop widths.
- Confirm all existing routes still load with no behavior changes.

**Acceptance:**

- Exact theme tokens are active in the design-system preview.
- New primitives contain no page-specific hard-coded colors.
- Existing feature flows remain operational.
- No legacy CSS is deleted while still referenced.

### UX1 — App Shell, Navigation, and Global Feedback

**Goal:** Establish one role-aware frame and consistent global interaction behavior.

**Deliverables:**

- New `AppShell`, `RoleSidebar`, `MobileNavigation`, `TopBar`, `PageHeader`, and `ScopeBadge`.
- Navigation configuration for all eight roles and anonymous users.
- Accessible account menu, notification entry point, breadcrumbs, and mobile drawer.
- Standard toast provider, error boundary presentation, route loading state, and not-found state.
- Theme selection behavior and persistence if dark mode is approved.
- Preserve all current route destinations and guards.

**Acceptance:**

- Each role sees only relevant destinations.
- Backend authorization remains decisive.
- Navigation works with keyboard, screen reader, mobile, and desktop.
- Existing notifications and logout behavior remain functional.

### UX2 — Public Home and Authentication

**Goal:** Create a credible first impression and a focused entry into Civique.

**Deliverables:**

- Public landing page.
- Sign-in and citizen registration redesign.
- Trust/process/privacy content.
- Auth loading, validation, error, and success states.
- Post-auth redirect based on role and intended destination.

**Acceptance:**

- Citizen registration still creates only `CITIZEN`.
- All demo/real roles can sign in through the existing auth contract.
- No secrets or privileged role selection appear in public UI.

### UX3 — Citizen Report Wizard

**Goal:** Make reporting an issue obvious, fast, and failure-safe.

**Deliverables:**

- Four-stage evidence, description, location, and review wizard.
- Secure evidence preview and validation feedback.
- AI advisory presentation with pending/offline/override states.
- Location permission explanation, map correction, and service-area feedback.
- Submission progress, idempotency protection, and tracking success page/state.

**Acceptance:**

- Existing report payload and upload contract remain valid.
- Reports persist when AI is unavailable.
- Back/forward navigation does not lose completed step state.
- Mobile camera/location workflow passes E2E.

### UX4 — Citizen Reports, Detail, and Profile

**Goal:** Make progress and required citizen action easy to understand.

**Deliverables:**

- My Reports list with useful grouping/filtering.
- Actual event-driven report timeline.
- Evidence, assignment, location, and status summaries.
- Confirmation/dispute surface when backend support is available.
- Honest profile and notification preference forms.

**Acceptance:**

- Citizens can access only their private reports plus public data.
- Timeline reflects API data, not hard-coded milestones.
- Unsupported settings are not presented as saved.

### UX5 — Public Live Map and Incident Discovery

**Goal:** Make civic activity discoverable, responsive, and privacy-safe.

**Deliverables:**

- Reliable map canvas sizing and tile/error states.
- Desktop split layout and mobile bottom sheet.
- Marker clusters, category/status legend, and list alternative.
- URL-aware filters and empty/filter-reset states.
- Redacted incident preview and detail navigation.
- Real-time update/reconnect indicator.

**Acceptance:**

- Map renders on supported viewport sizes.
- Privacy-safe incidents appear and non-public incidents do not.
- Marker and list selections remain synchronized.
- Reconnect reconciles without duplicates.

### UX6 — Municipal Overview and Queue

**Goal:** Give officials an actionable, scope-correct work surface.

**Deliverables:**

- Role/scope-aware dashboard.
- Real metrics, priority queues, SLA-risk queue, recent activity, and map preview.
- Incidents directory with server filters, pagination, and responsive table/cards.
- Reports directory preserving Report/Incident distinction.

**Acceptance:**

- Each official sees only backend-authorized scope.
- No hard-coded analytics or mock actions appear as real.
- Filters, loading, empty, error, and retry states work.

### UX7 — Incident Operations and Routing

**Goal:** Turn incident detail into a safe, understandable municipal workflow.

**Deliverables:**

- Operational incident summary and lifecycle action area.
- Evidence gallery, map, linked reports, SLA, assignment, AI advisory, and audit sections.
- Scoped assignment/routing dialog.
- State-machine-valid transition actions and consequence dialogs.
- Real-time reconciliation that preserves active form input.

**Acceptance:**

- Invalid actions are unavailable and backend checks remain enforced.
- Assignment and status mutations call existing APIs correctly.
- Audit/history refreshes after successful operations.

### UX8 — Field Worker Mobile Operations

**Goal:** Provide a focused mobile work-order experience.

**Deliverables:**

- Today, assigned, in-progress, and submitted task views.
- Work map and task detail.
- Start-work action.
- After-evidence capture, notes, progress, retry, and resolution submission.
- Clear post-submission verification state.

**Acceptance:**

- Only assigned/authorized work is visible and actionable.
- Start and submit transitions remain valid.
- Failed uploads can retry without duplicate resolution submissions.

### UX9 — Notifications, People, and Settings

**Goal:** Complete supporting workflows without false functionality.

**Deliverables:**

- Durable notification center and preferences.
- People directory/management limited to existing authorized APIs.
- City/department settings grouped by real persisted capabilities.
- Consistent dialogs, confirmations, toasts, and audit feedback.

**Acceptance:**

- Personal notifications remain private.
- Unsupported email/SMS behavior is visibly unavailable.
- No setting reports success without persistence.

### UX10 — Analytics, Accessibility, Performance, and Final Migration

**Goal:** Complete visual consistency and prove the redesigned golden workflow.

**Deliverables:**

- Accessible analytics presentation for real M18 data only; until then, an honest limited state.
- Full responsive and accessibility audit.
- Performance optimization for images, maps, routes, and bundles.
- Visual regression suite across core routes and roles.
- End-to-end golden workflow.
- Removal of zero-use legacy components, `.premium-*` classes, and hard-coded theme literals.
- Final design-system documentation.

**Acceptance:**

- Golden workflow passes from report through verified resolution.
- No active route depends on legacy theme classes.
- No known critical accessibility or responsive defects remain.
- Functionality-preservation contracts pass for every migrated route.

### UX11 — RBAC, Organization, and Employee Administration

**Goal:** Give authorized administrators a precise, auditable way to manage protected templates, custom roles, permissions, scopes, employees, and temporary delegation.

**Deliverables:**

- People and employee-detail views with designation, organization, skills, shift, availability, workload, supervisor, account state, assignments, sessions, and audit history.
- Organization tree, protected/custom role directory, role detail, permission matrix, scope-grant editor, delegation workflow, invitations, transfers, suspensions, and separation-of-duties feedback.
- Dense desktop tables and comparison panels with mobile-safe read/action layouts.

**Acceptance:**

- UI never implies permission beyond backend evaluation.
- Reserved permissions and self-elevation are visibly and technically blocked.
- Expiry, conflict, stale-version, denied, and audit-confirmation states are complete.

### UX12 — Civique Socio and Moderation

**Goal:** Deliver an explicit-consent civic feed without exposing private Report data or turning engagement into municipal authority.

**Deliverables:**

- `/socio` locality/category/status feed, `/socio/[postId]`, publication preview, alias setup, follow/save/support, structured `AFFECTED` corroboration, shallow comments, content reporting, blocks/mutes, and revocation.
- Admin moderation queue, case detail, redaction/removal/lock/suspension actions, reason capture, appeal review, and ranking/provenance inspection.
- Official status events visually separated from citizen discussion.

**Acceptance:**

- Only approved redacted derivatives and generalized locations render publicly.
- Revocation removes the projection but preserves the official civic record.
- Anonymous comments, DMs, public contact details, unrestricted media, and popularity-driven priority are absent.

### UX13 — Accountability, Assets, and Predictive Intelligence

**Goal:** Present accepted M18–M21 data honestly, accessibly, and with complete provenance.

**Deliverables:**

- Public accountability and civic-health routes with suppressed-cohort explanations and accessible tables for every chart.
- Asset directory/map/detail/import workflow and Incident link/correction UI.
- Prediction map/list, confidence ranges, evaluation history, model/data provenance, and operator feedback.

**Acceptance:**

- Every metric, score, and forecast shows definition/version, scope, freshness, uncertainty, and source.
- Forecast failure or stale aggregates do not affect core reporting.

### UX14 — Integrations, Tenant Administration, and Release Acceptance

**Goal:** Complete authorized external synchronization, city provisioning, and the final multi-role production UX gate.

**Deliverables:**

- Integration configuration/status, signed-webhook delivery history, conflicts, reconciliation, repair, and external references.
- Tenant/city provisioning, geography/policy/branding/provider configuration, feature flags, and bounded cross-city administration.
- Full Hindi/English, accessibility, responsive, security, visual, and golden-flow release evidence.

**Acceptance:**

- Live integration controls remain disabled until authority/provider approval exists.
- Cross-city isolation and reserved-permission behavior pass from UI through API.
- No active route depends on legacy theme classes or false/mock controls.

## 17. Verification Strategy

### 17.1 Automated checks for every UX module

- `npm run typecheck --workspace=apps/web`.
- `npm run lint --workspace=apps/web`.
- `npm run build --workspace=apps/web`.
- Component tests for behavior and accessibility.
- API adapter tests using realistic success/error fixtures.
- Playwright checks for affected workflows and responsive breakpoints.
- Visual regression screenshots for light and dark themes where supported.

### 17.2 Required role test accounts

Acceptance runs should cover:

- Citizen.
- Field worker.
- Ward officer.
- Department head.
- Zonal officer.
- Commissioner.
- City admin.
- Super admin.

Credentials remain environment-controlled seed data and must never be embedded in UI source, screenshots, or committed documentation.

### 17.3 Golden workflow

1. Citizen signs in.
2. Citizen submits evidence and location.
3. Report and incident are created.
4. Incident appears on the privacy-safe live map.
5. Authorized official sees it in the correct queue.
6. Official assigns an authorized field worker.
7. Field worker starts the work.
8. Field worker submits resolution evidence.
9. Verification result is shown as advisory/workflow state.
10. Citizen confirms or disputes when the backend enables the action.
11. Final state and audit history display consistently across citizen, official, and public views.

## 18. Rollout and Review Gates

- Implement exactly one UX module at a time.
- At the end of each module, provide screenshots at agreed breakpoints and a route-by-route test report.
- The user reviews the module before the next UX module begins.
- Fix correctness and broken behavior before visual refinements.
- Do not remove the fallback legacy UI for a route until its replacement is accepted.
- Do not combine this program with unrelated backend modules unless a minimum dependency blocks the UI workflow.

## 19. Risks and Mitigations

### Theme registry overwrites existing CSS

Mitigation: inspect generated diffs, apply tokens deliberately, preserve Leaflet and legacy declarations, and never use a blind overwrite.

### Visual rewrite breaks working mutations

Mitigation: record route functionality contracts and add E2E coverage before replacing each screen.

### Shadcn dependency expansion

Mitigation: add only components needed for the current UX module and review package changes.

### “Exact Cloudflare” conflicts with civic status semantics

Mitigation: keep the exact Cloudflare base tokens and add a separate accessible lifecycle/priority semantic layer.

### Font loading causes build or privacy issues

Mitigation: self-host approved Inter and Fira Code files instead of relying on a runtime external request.

### Existing unfinished controls appear functional

Mitigation: connect them to real APIs, disable them with a clear explanation, or remove them from active navigation until their backend module is ready.

### One-shot replacement creates an unreviewable regression

Mitigation: use UX0–UX14 review gates and keep each change small enough to test and revert independently.

## 20. Current Implementation Recommendation

Preserve the implemented UX0–UX7 work and complete its remaining lint, accessibility, responsive, and functionality-preservation evidence. The next bounded UI slice is **UX8 — Field Worker Mobile Operations**, because it is required for the P0 golden flow through `RESOLUTION_SUBMITTED`. Do not start Socio or later intelligence screens before their backend and privacy gates pass.

## 21. Definition of UI Program Completion

The Civique UI transformation is complete only when:

- Every active page uses the approved design system.
- Existing working functionality is preserved and covered by tests.
- Every role has an intentional, scope-correct navigation and landing experience.
- Citizen and field-worker workflows are mobile-first.
- Official workflows are desktop-efficient and responsive.
- Maps, notifications, uploads, dialogs, forms, and real-time states have complete feedback behavior.
- No mock/no-op control is presented as functional.
- Public views protect citizen privacy.
- Status, priority, SLA, AI, and evidence language is consistent.
- Accessibility and responsive acceptance gates pass.
- Legacy theme styles are removed only after zero-use verification.
- Documentation, screenshots, and component guidance are current.

---

## Research References

- TweakCN Cloudflare theme: <https://tweakcn.com/themes/cmqx9le2j000504l49jgxe1d0>
- TweakCN registry item: <https://tweakcn.com/r/themes/cmqx9le2j000504l49jgxe1d0>
- shadcn/ui Next.js installation: <https://ui.shadcn.com/docs/installation/next>
- shadcn/ui theming: <https://ui.shadcn.com/docs/theming>
- shadcn/ui registry: <https://ui.shadcn.com/docs/registry>
