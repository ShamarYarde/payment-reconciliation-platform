# Testing Strategy

## 1. Test Types
This project currently includes two main types of tests: domain and integration tests.

### Domain Tests
Domain tests validate reconciliation rules independently of database and API infrastructure. These tests verify whether payment and settlement transactions satisfy the matching rules used by the reconciliation workflow. 

### Integration Tests
Integration tests verify behavior across application services, database persistence, worker processing, and API routes.

The current integration suite covers:

- exception outcomes when a counterpart exists but does not satisfy reconciliation rules
- late-arriving transaction re-reconciliation
- matched outcomes when a compatible counterpart exists
- pending outcomes when no compatible counterpart exists
- reconciliation result retrieval with associated transactions
- 404 responses when a reconciliation result does not exist
- reconciliation job retry and recovery behavior
- reconciliation worker processing
- transaction ingestion and reconciliation job creation

## 2. Test Database
Integration tests use a dedicated PostgreSQL database named `reconciliation_test`.

Create the database with:

`createdb reconciliation_test`

Apply database migrations with:

`DATABASE_URL=postgresql://localhost:5432/reconciliation_test npm run db:migrate`

## 3. Execution
Run the automated test suit with:

`npm run test`

## 4. Typechecking
Static type checking is performed using the TypeScript compiler through the `typecheck` npm script:

`npm run typecheck`

## 5. Parallelism
Integration tests can be run with ``--no-file-parallelism`` because they share one PostgreSQL test database and mutate the same tables. 

Running these files concurrently can cause race conditions between test setup and cleanup operations, such as one test deleting records that another test still references through foreign keys.

Serial execution avoids this shared-state interference.

## 6. Key Scenarios Covered
### Matched transactions
A compatible payment and settlement satisfy the reconciliation rules and produce a `matched` reconciliation result.

### Pending
A transaction has no compatible counterpart currently available and produces a `pending` reconciliation result.

### Exception
A counterpart transaction exists but does not satisfy the reconciliation rules, producing an `exception` result.

### Result Retrieval 
A reconciliation result can be retrieved with its reconciliation job ID, outcome, rule code, reason, creation timestamp, and associated transactions.

### Transaction Ingestion
Transactions are checked for duplicates using the source ID and external transaction ID.
Existing transactions are returned without creating duplicate records and additional reconciliation jobs. New transactions are persisted as part of an import batch and assigned a reconciliation job.

### Worker Processing
The reconciliation worker claims one pending reconciliation job per invocation, loads its associated transactions, processes the reconciliation rules, and persists the resulting outcome.

### Retry and Recovery
A failed reconciliation job can be retried up to three total attempts.
After the first and second failures, the job is returned to `pending`. After the third unsuccessful attempt, the job is marked `failed`.
Retry tests use controlled failures by deliberately making reconciliation processing throw a simulated error. This allows the retry behavior to be tested deterministically.

### Late-arriving Reconciliation
When a transaction previously produced a `pending` result because no counterpart existed, ingestion of a matching counterpart creates a new re-reconciliation job.
The new job can produce a `matched` result while preserving the original `pending` result as historical reconciliation data.

Before each integration test, database records are deleted in foreign-key-safe order:
1. reconciliation result transactions
2. reconciliation results
3. reconciliation job transactions
4. reconciliation jobs
5. transactions
6. import batches
7. transaction sources

This prevents state from one test affecting another.

### Known Limitations
The current automated testing strategy does not include:
- load or performance
- end-to-end browser testing
- continuous integration execution
- production infrastructure testing