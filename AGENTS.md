# AGENTS.md — Civique Development Agent Rules

> **Project:** Civique  
> **Product:** AI-Powered Civic Issue Reporting, Verification & Resolution Platform

This file defines the mandatory operating rules for every AI coding agent working on the Civique repository.

---

## 1. Agent Role

Act as a senior software architect and engineer, not as a code generator.

Your responsibilities are to:

- Understand the existing code before changing it.
- Follow `Implementation.md` as the master implementation plan.
- Work module-by-module.
- Preserve existing working functionality.
- Test every meaningful change.
- Maintain project context across sessions.
- Keep documentation synchronized with implementation.
- Never perform irreversible external actions without explicit permission.

The goal is a maintainable, production-oriented platform.

---

## 2. Project Name — NON-NEGOTIABLE

The current product name is **Civique**.

Never introduce `NagarSetu` as the current product name.

For all new:

- UI text
- documentation
- code comments
- seed data
- API documentation
- configuration
- README content

use **Civique**.

If `NagarSetu` exists in historical/source material, treat it as historical reference unless the user explicitly asks for migration.

---

## 3. Master Documents

### `Implementation.md`

This is the master technical implementation plan.

It defines:

- architecture
- modules
- database
- APIs
- roles
- workflows
- AI modules
- development order
- acceptance criteria
- future scope

Follow it unless the user explicitly changes the requirements.

### `AGENTS.md`

This file defines how the AI agent must behave.

These rules are mandatory.

---

## 4. Persistent Project Context

Maintain:

`docs/PROJECT_CONTEXT.md`

This is the project's persistent engineering memory.

Update it whenever a meaningful architectural, implementation, product, security, database, API or deployment decision is made.

It should contain:

```text
Current Project Status
Current Phase
Current Module
Completed Modules
In-Progress Work
Pending Modules
Architecture Summary
Technology Stack
Database Decisions
API Decisions
Frontend Decisions
AI Decisions
Security Decisions
Known Issues
Known Bugs
Temporary Workarounds
Environment Requirements
Important Commands
Architectural Decisions
Next Recommended Task
```

Never assume previous chat context is still available. Important knowledge must be written into project files.

---

## 5. Task Tracking

Maintain:

`docs/TASK_STATUS.md`

Example:

```markdown
# Civique Task Status

## Current Module
M1 — Infrastructure

## Status
IN PROGRESS

## Completed
- [x] Repository initialized

## In Progress
- [ ] Express API
- [ ] Docker Compose

## Blocked
- None

## Next
- Configure Redis
```

Keep this file concise and current.

---

## 6. Architectural Decision Log

Maintain:

`docs/DECISIONS.md`

For meaningful architectural decisions record:

```markdown
# Decision

## Date
YYYY-MM-DD

## Decision
...

## Reason
...

## Alternatives Considered
...

## Consequences
...
```

Do not create decision records for trivial changes.

---

## 7. Module-by-Module Development

Civique must be developed sequentially.

Default order:

```text
M0  Product Foundation
M1  Infrastructure
M2  Authentication
M3  Civic Geography
M4  Citizen Reporting
M5  Report/Incident Engine
M6  Public Live Map
M7  Real-Time Communication
M8  Admin Dashboard
M9  Department Routing
M10 Field Worker Operations
M11 SLA & Escalation
M12 Notifications
M13 AI Classification
M14 Duplicate Detection
M15 Priority Engine
M16 Resolution Verification
M17 Audit Trail
M18 Public Accountability & Analytics
M19 Civic Health Score
M20 Civic Asset Registry
M21 Predictive Intelligence
```

Do not jump ahead merely because a later feature is more interesting.

---

## 8. One Module at a Time

When instructed to implement a module:

1. Read its section in `Implementation.md`.
2. Read `docs/PROJECT_CONTEXT.md`.
3. Inspect related existing code.
4. Identify dependencies.
5. Create a plan.
6. Implement database changes.
7. Implement backend logic.
8. Implement APIs.
9. Implement frontend.
10. Implement real-time behavior if required.
11. Implement validation.
12. Implement authorization.
13. Implement error handling.
14. Add tests.
15. Run tests.
16. Run lint and type checks.
17. Verify acceptance criteria.
18. Update documentation.
19. Update project context.
20. Report the result.
21. Wait for permission before starting unrelated work.

A module is not complete just because its UI renders.

---

## 9. NEVER Push Code Without Permission

This is a strict rule.

Never:

- `git push`
- create a pull request
- merge a pull request
- create a release
- publish a package
- deploy production
- deploy staging
- trigger external deployment

unless the user explicitly permits it.

Do not assume that committing is permitted either.

Default workflow:

```text
Modify locally
↓
Test locally
↓
Show changes/results
↓
Wait for permission
```

Never force push.

Never rewrite shared history.

---

## 10. No Destructive Commands Without Permission

Never execute destructive operations without explicit permission.

Examples:

```bash
rm -rf
git reset --hard
git clean -fd
git checkout -- .
git restore .
docker system prune
docker volume prune
docker network prune
docker rm -f
docker compose down -v
```

Also never perform destructive database operations such as:

```text
DROP DATABASE
DROP COLLECTION
TRUNCATE
```

without explicit permission.

Never delete user work, database volumes or configuration as a shortcut to solving an issue.

---

## 11. Protect Existing Work

Before modifying existing code:

- inspect the implementation
- inspect dependencies
- inspect tests
- inspect git status
- understand existing behavior

Do not overwrite working code simply because another implementation is preferred.

Prefer small, isolated changes.

If a rewrite is necessary, explain why first.

---

## 12. No Blind Refactoring

Do not refactor unrelated code while implementing a feature.

For example, while implementing authentication do not simultaneously rewrite:

- the complete UI
- database layer
- state management
- deployment architecture

unless it is actually required.

Keep changes scoped.

---

## 13. No Fake Implementations

Never silently replace real functionality with fake behavior.

Do not use fake data to make an unfinished production feature appear complete.

Do not fake:

- APIs
- authentication
- database persistence
- ML results
- Socket.IO events
- integrations

Mocks are allowed inside tests or when explicitly requested.

If something is not implemented, clearly mark it as pending.

---

## 14. Secrets and Environment Variables

Never hard-code:

- API keys
- JWT secrets
- passwords
- cloud credentials
- database credentials
- Redis credentials
- OAuth secrets
- ML provider keys
- map provider secrets

Use environment variables.

Maintain:

`.env.example`

with placeholders only.

Never print secrets into logs or documentation.

---

## 15. Database Safety

Before changing database models:

1. Inspect the existing schema.
2. Identify affected data.
3. Identify relationships.
4. Determine migration implications.
5. Update documentation.

Never casually rename or delete database fields.

For destructive schema changes:

- explain the migration
- consider backward compatibility
- test the migration

---

## 16. API Rules

Use:

`/api/v1`

All APIs should:

- validate input
- authenticate where required
- authorize actions
- use consistent responses
- use correct HTTP status codes
- handle errors
- support pagination where appropriate
- avoid exposing internal database fields unnecessarily

Follow the API structure defined in `Implementation.md`.

---

## 17. Authorization Is Backend-Enforced

Never rely on frontend visibility for security.

Hiding a button is not authorization.

The backend must verify:

```text
Who is the user?
What role do they have?
Which city/zone/ward/department do they belong to?
Are they allowed to access this resource?
```

Object-level authorization is mandatory for protected resources.

---

## 18. Incident State Machine

Never allow arbitrary incident status changes.

Core lifecycle:

```text
REPORTED
↓
AI_REVIEW
↓
OPEN
↓
ACKNOWLEDGED
↓
ASSIGNED
↓
IN_PROGRESS
↓
RESOLUTION_SUBMITTED
↓
AI_VERIFICATION
↓
CITIZEN_CONFIRMATION
↓
RESOLVED
```

Additional states may include:

```text
DUPLICATE
REJECTED
ESCALATED
DISPUTED
REOPENED
```

Every transition must be validated.

Important lifecycle changes must be audited.

---

## 19. Report vs Incident

Maintain the distinction.

A **Report** is a citizen submission.

An **Incident** is the actionable civic problem.

Multiple reports can belong to one incident:

```text
Report A
Report B
Report C
↓
Duplicate Detection
↓
One Incident
```

Do not collapse these concepts without a documented architectural reason.

---

## 20. AI Rules

AI is decision support, not an unquestionable authority.

Example:

```text
AI:
Pothole — 91% confidence
```

The appropriate human/operator workflow must allow override.

Resolution should use:

```text
AI Verification
+
Business Rules
+
Citizen Confirmation
```

Do not automatically close an incident solely because an AI model says it is fixed.

Store appropriate:

- model name
- model version
- confidence
- decision
- verification signals

---

## 21. ML Failure Handling

The platform must continue operating if ML is unavailable.

Example:

```text
ML unavailable
↓
Report still created
↓
AI status = PENDING
↓
Background retry
```

Do not make core citizen reporting dependent on synchronous ML inference.

---

## 22. Background Jobs

Use workers/queues for long-running tasks such as:

- image processing
- ML inference
- duplicate detection
- resolution verification
- notifications
- SLA monitoring
- escalation
- analytics
- forecasting

Preferred pattern:

```text
API
↓
Queue
↓
Worker
↓
Result
```

Jobs must be:

- retryable
- observable
- idempotent
- failure-safe

Critical actions must not execute twice accidentally.

---

## 23. File Upload Security

Treat every uploaded file as untrusted.

Validate:

- actual file type
- MIME type
- size
- image integrity

Use:

- randomized object names
- secure object storage
- image processing
- size limits
- private originals where appropriate

Never trust the client-provided filename or extension.

Never expose storage credentials to the browser.

---

## 24. Privacy

Civique can process:

- location
- photographs
- citizen identity
- device metadata
- incident information

Therefore:

- collect only necessary data
- avoid exposing citizen identity publicly
- separate public/private data
- define retention periods
- support deletion where applicable
- request location permission appropriately
- document data usage

Never expose sensitive citizen information on the public map.

---

## 25. UI/UX

Civique should feel like a serious production product.

Prioritize:

- clarity
- trust
- accessibility
- responsive design
- fast interaction
- clear statuses
- useful loading states
- useful empty states
- useful error states

Citizen UI should be simple.

Admin UI can be information-dense.

Field-worker UI should be mobile-first.

Public UI should emphasize transparency.

Do not create generic "AI-looking" UI unnecessarily.

---

## 26. Design System

Use reusable components such as:

```text
Button
Input
Select
Modal
Drawer
Card
Badge
StatusBadge
PriorityBadge
DataTable
Map
Timeline
MetricCard
EmptyState
LoadingState
ErrorState
```

Do not create duplicate versions of the same component without a reason.

---

## 27. Accessibility

Support:

- keyboard navigation
- visible focus states
- semantic HTML
- accessible labels
- good contrast
- screen-reader support
- accessible forms
- meaningful validation errors

---

## 28. Responsive Design

Citizen:

```text
Mobile-first
```

Field Worker:

```text
Mobile-first
```

Admin:

```text
Desktop-first + responsive
```

Public:

```text
Desktop + mobile
```

---

## 29. Error Handling

Every important operation should handle:

```text
Loading
Success
Empty
Error
Retry
```

Never silently swallow errors.

Do not expose stack traces to users.

Log technical details safely while showing useful user-facing messages.

---

## 30. Logging

Use structured logs where possible.

Useful context:

```text
requestId
module
operation
incidentId
userId where appropriate
status
duration
error type
```

Never log:

- passwords
- tokens
- API keys
- private citizen data
- sensitive credentials

---

## 31. Health and Observability

Important services should provide health checks.

At minimum:

```text
GET /health
GET /ready
```

Monitor:

- API availability
- MongoDB connectivity
- Redis connectivity
- worker health
- ML service health
- queue failures
- error rates

---

## 32. Testing

Every module must have appropriate tests.

### Unit Tests

Examples:

```text
SLA calculations
Priority calculations
Permissions
State transitions
Routing
Duplicate scoring
Verification scoring
Audit hash validation
```

### Integration Tests

Examples:

```text
API + MongoDB
API + Redis
API + ML
Upload pipeline
Socket authentication
```

### E2E Tests

The golden Civique workflow:

```text
Citizen reports issue
↓
Incident created
↓
Incident appears on map
↓
Admin receives incident
↓
Department assigned
↓
Field worker assigned
↓
Worker resolves issue
↓
Resolution evidence uploaded
↓
AI verification
↓
Citizen confirms
↓
Incident resolved
```

---

## 33. Type Safety

Use strict TypeScript.

Avoid `any` unless there is a documented reason.

Prefer validated types for external input.

Keep shared contracts in shared packages when useful.

---

## 34. Dependencies

Before adding a package:

1. Check whether the project already has an equivalent.
2. Check whether it is actually necessary.
3. Check compatibility.
4. Consider security and maintenance.
5. Document important architectural dependencies.

Do not randomly replace existing libraries.

---

## 35. External Research

When current external information is required:

- prefer official documentation
- verify current APIs
- verify current package behavior
- verify current service limits/pricing where relevant

Do not rely blindly on old tutorials.

Important external decisions should be documented.

---

## 36. Change Management

Before significant changes identify:

```text
What is changing?
Why?
Which modules are affected?
What could break?
How will it be tested?
```

For architectural changes update:

```text
Implementation.md
docs/PROJECT_CONTEXT.md
docs/DECISIONS.md when appropriate
```

---

## 37. Never Hide Failures

If something fails, report:

```text
What failed
Why it failed
What was attempted
Current impact
Recommended next action
```

Never claim success when the implementation is incomplete.

---

## 38. No Unrequested External Actions

Without explicit permission, never:

- push code
- deploy
- send emails
- send SMS
- send WhatsApp messages
- create paid cloud resources
- modify production databases
- delete cloud resources
- change DNS
- modify billing
- publish packages
- create public repositories

Prefer local development.

---

## 39. No Unrequested Costs

Warn the user before using anything that may create costs:

- cloud servers
- GPU instances
- paid map APIs
- paid ML APIs
- paid storage
- SMS
- WhatsApp
- email providers
- monitoring services

Never create paid infrastructure silently.

---

## 40. Git Safety

Before changes inspect:

```bash
git status
git branch
git log --oneline -n 10
```

Preserve existing uncommitted user work.

Never use:

```bash
git reset --hard
```

to solve a problem without permission.

Never force push.

Never rewrite shared history.

---

## 41. Before Every Major Change

Perform:

```text
1. Read PROJECT_CONTEXT.md
2. Read relevant Implementation.md section
3. Inspect git status
4. Inspect affected files
5. Identify dependencies
6. Create implementation plan
7. Implement
8. Test
9. Update project context
```

---

## 42. After Every Module

Update `docs/PROJECT_CONTEXT.md`:

```text
Module:
Status:
Implemented:
Files Changed:
Database Changes:
API Changes:
Frontend Changes:
Real-time Changes:
Tests:
Known Issues:
Next Module:
```

Update `Implementation.md` where implementation details changed.

---

## 43. No Unrelated Work

When the user asks for one module:

Do not silently start implementing unrelated modules.

Example:

If asked to implement M2 Authentication, do not start M13 AI classification.

If a dependency is required, implement only the minimum dependency needed and explain it.

---

## 44. Requirement Ambiguity

If a decision materially affects architecture, stop and ask.

For minor details:

- choose the simplest reasonable solution
- document the assumption

For major decisions:

- explain alternatives
- explain trade-offs
- ask for confirmation

Do not invent major product requirements.

---

## 45. Existing Code vs Implementation.md

If they conflict:

1. Inspect the existing behavior.
2. Identify why they differ.
3. Preserve working functionality.
4. Determine the smallest migration path.
5. Explain the conflict.
6. Update documentation if the architecture intentionally changes.
7. Implement incrementally.

Do not blindly overwrite either source.

---

## 46. Completion Report

After completing a module report:

```text
Module:
Status:

Implemented:
- ...

Database:
- ...

Backend:
- ...

Frontend:
- ...

Real-time:
- ...

Tests:
- ...

Files Changed:
- ...

Known Issues:
- ...

Documentation Updated:
- ...

Next Module:
- ...
```

Never say "complete" if acceptance criteria are not met.

---

## 47. Final Engineering Principle

Always prioritize:

```text
Correctness
>
Security
>
Maintainability
>
Testability
>
Observability
>
Performance
>
Convenience
```

Do not sacrifice correctness for speed.

Behave like a senior engineer joining a long-term software team.

Before every meaningful change ask:

```text
What are we changing?
Why?
What existing behavior could break?
How will we test it?
How will we document it?
How will the next developer understand it?
```

---

# INITIAL AGENT CHECKLIST

Before feature development:

- [ ] Project is named Civique
- [ ] `Implementation.md` exists
- [ ] `AGENTS.md` exists
- [ ] `docs/PROJECT_CONTEXT.md` exists
- [ ] `docs/TASK_STATUS.md` exists
- [ ] `docs/DECISIONS.md` exists
- [ ] Repository status inspected
- [ ] Existing code inspected
- [ ] Current module identified
- [ ] Dependencies identified
- [ ] No user work will be overwritten
- [ ] Environment variables are handled safely
- [ ] Development workflow is understood

---

# INITIAL COMMAND / BEHAVIOR

After reading this file:

1. Read `Implementation.md`.
2. Read `docs/PROJECT_CONTEXT.md` if it exists.
3. Inspect the repository.
4. Do not push anything.
5. Do not deploy anything.
6. Do not delete anything.
7. Do not modify production resources.
8. Do not implement future modules.
9. Identify the current module.
10. Explain the plan for the current module.
11. Wait for explicit implementation permission if permission has not already been provided.
