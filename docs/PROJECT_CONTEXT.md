# Project Context: Civique

This document serves as the persistent engineering memory for **Civique**.

## Current Project Status
- **Current Phase**: Phase 1 — Foundation
- **Current Module**: Module 3 — Civic Geography
- **Completed Modules**:
  - [x] M0 — Product Foundation
  - [x] M1 — Infrastructure and Project Setup
  - [x] M2 — Authentication & Authorization
- **In-Progress Work**:
  - Initial planning for M3 city/zone/ward database models and geofence mapping parameters.
- **Pending Modules**:
  - M4 — Citizen Reporting
  - M5 — Report/Incident Engine
  - M6 — Public Live Map
  - M7 — Real-Time Communication
  - M8 — Admin Dashboard
  - M9 — Department Routing
  - M10 — Field Worker Operations
  - M11 — SLA & Escalation
  - M12 — Notifications
  - M13 — AI Classification
  - M14 — Duplicate Detection
  - M15 — Priority Engine
  - M16 — Resolution Verification
  - M17 — Audit Trail
  - M18 — Public Accountability & Analytics
  - M19 — Civic Health Score
  - M20 — Civic Asset Registry
  - M21 — Predictive Intelligence

## Architecture Summary
Civique is a full-stack GovTech platform featuring:
- **Next.js PWA** frontend using Tailwind CSS.
- **Express.js API** backend using TypeScript and Node.js.
- **FastAPI** service for deep-learning components.
- **PostgreSQL (Supabase)** database with Prisma ORM.

## Technology Stack
- **Languages**: TypeScript, Python
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma ORM

## Database Decisions
- **Spatial Queries**: Use PostGIS geometries or coordinates query logic inside PostgreSQL to support geofencing, nearby lookup, and viewport clustering query filters.

## Security Decisions
- Backend-enforced RBAC (Role-Based Access Control) supporting 8 distinct roles.
- Citizen submission allows anonymous tracking codes.

## Known Issues
- None (All Module 2 authentication integration checks successful)

## Environment Requirements
- Node.js (v22.22.1+)
- Python (3.14+)
- Postgres (Supabase)

## Next Recommended Task
- Setup database migrations and shape boundary queries for Module 3 (Civic Geography).
