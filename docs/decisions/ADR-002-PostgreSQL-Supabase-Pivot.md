# ADR-002: Pivot to PostgreSQL (Supabase) and Stack Simplification

## Date
2026-08-15

## Decision
Replace MongoDB and Redis/BullMQ with PostgreSQL (Supabase) as the primary database storage solution. Defer Redis/BullMQ background worker integration until explicitly required.

## Reason
- **Relational Integrity**: Civic entities (Users, Cities, Wards, Departments, Reports, Incidents) are highly relational. PostgreSQL provides strong foreign key constraints, transactional guarantees, and spatial querying (PostGIS).
- **Supabase Integration**: Supabase provides managed PostgreSQL, authentication interfaces, and auto-generated REST/GraphQL APIs, reducing custom API management overhead.
- **Complexity Reduction**: Removing Redis/BullMQ in the early phases reduces local runtime footprint and speeds up development cycles.

## Alternatives Considered
- **MongoDB**: Schema-less document database. Decided against because relational constraints are critical for incident assignments and audit logs.

## Consequences
- The backend API will connect to PostgreSQL using a client pool (`pg` library) or Prisma ORM.
- Local compose configuration runs PostgreSQL instead of MongoDB and Redis.
- Background jobs were initially allowed to run as simple asynchronous processes while the prototype was established. The correction-first plan identifies this as insufficient for production reliability. M1 will implement or formally approve a durable PostgreSQL job/outbox design while continuing to defer Redis/BullMQ unless scale measurements justify it.
