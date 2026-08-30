# ADR-0001: Database Selection

## Status

Accepted

## Context

The payment reconciliation system requires persistent storage for transactions, import batches, reconciliation jobs, reconciliation results, reconciliation exceptions, exception resolutions, users, and audit events.

The database must support:

- Relational data and referential integrity.
- Atomic transactions.
- Unique constraints for duplicate prevention and idempotency.
- Exact financial value storage.
- Efficient filtering and reconciliation queries.
- Concurrent API and background-worker access.
- Indexing for operational search and reporting.
- Local development and low-cost deployment.
- Migration and schema-management tooling.

The system is expected to use a relational data model, so the database selection is focused on relational database technologies.

## Options Considered

### Option 1 — PostgreSQL

Advantages:

- Strong relational and transactional capabilities.
- Supports foreign keys, unique constraints, and advanced indexing.
- Provides exact numeric types suitable for financial data.
- Strong concurrency support.
- Mature ecosystem and tooling.
- Broad support across Node.js and TypeScript database libraries.
- Available locally and through multiple low-cost or free development hosting options.
- Supports structured data such as JSON where source payload retention is required.

Disadvantages:

- Requires a database server for development unless containerized or hosted.
- More operational complexity than an embedded database such as SQLite.
- Some PostgreSQL-specific features could increase vendor-specific coupling if used extensively.

### Option 2 — MySQL

Advantages:

- Mature relational database.
- Strong ecosystem and broad hosting support.
- Supports transactions, constraints, indexes, and exact decimal types.
- Well supported by Node.js and TypeScript tooling.

Disadvantages:

- Some advanced query and indexing capabilities differ from PostgreSQL.
- PostgreSQL provides features that may be useful for this project's analytical and reconciliation-oriented workloads.
- Selecting MySQL would not provide a significant project-specific advantage over PostgreSQL.

### Option 3 — SQLite

Advantages:

- Very simple local development.
- No separate database server required.
- Lightweight and free.
- Supports transactions and relational schemas.
- Useful for testing and small applications.

Disadvantages:

- Less suitable for demonstrating concurrent API and background-worker database access.
- Does not represent the intended deployment architecture as closely as a client-server relational database.
- Scaling and operational characteristics differ from the architecture expected for the reconciliation system.
- Would likely require a database change if the project later moved toward a more production-like deployment.

## Decision

PostgreSQL will be used as the primary relational database for the payment reconciliation system.

## Rationale

PostgreSQL provides the strongest fit for the system's requirements.

The reconciliation platform depends heavily on relational integrity, transactional consistency, duplicate prevention, indexing, and concurrent access from both API services and background workers.

PostgreSQL also supports exact numeric data types and strong constraint mechanisms that are appropriate for financial-style data.

Compared with SQLite, PostgreSQL more closely represents the database architecture expected in a production-oriented multi-component application.

Compared with MySQL, both databases satisfy the fundamental requirements, but PostgreSQL provides a strong combination of relational features, query capabilities, tooling, and ecosystem support without introducing additional project cost.

The database can also be run locally during development, allowing the project to remain within its low-cost development constraint.

## Consequences

### Positive

- The system can enforce referential integrity through foreign keys.
- Unique constraints can support duplicate prevention and idempotency.
- Database transactions can protect multi-record reconciliation operations.
- PostgreSQL indexing can support reconciliation and operational queries.
- The database can support concurrent API and worker access.
- The technology is widely supported by application and migration tooling.

### Negative

- Developers must run or connect to a PostgreSQL server.
- Database setup is more involved than using an embedded database.
- PostgreSQL-specific SQL or features may reduce portability to other database systems.

### Follow-up Decisions

The following decisions remain separate:

- Which database-access library or ORM will be used.
- Whether monetary values will use integer minor units or PostgreSQL `NUMERIC`.
- Which migration tool will manage schema changes.
- How PostgreSQL will be hosted in deployed environments.
- How local PostgreSQL development will be configured.