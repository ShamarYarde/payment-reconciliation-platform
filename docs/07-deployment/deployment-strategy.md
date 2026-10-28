# Deployment Strategy

## 1. API Process
1. The application ingests payments from configured sources.
2. A reconciliation job is created for a newly ingested transaction.
3. The reconciliation worker evaluates the transaction against the reconciliation rules.
4. If a compatible payment and settlement satisfy the reconciliation rules,a `matched` reconciliation result is stored.
5. If a counterpart exists but does not satisfy the reconciliation rules, an `exception` reconciliation result is stored.
6. If  no counterpart exists, a `pending` reconciliation result is stored.
7. Failed reconciliation jobs can be retried up to two additional times, for a maximum of three attempts.

## Reconciliation Worker Process
The reconcilation worker claims one pending reconciliation job per invocation, loads its associated transactions, processes the reconciliation rules, and persists the resulting outcome.

## PostgreSQL Database
The database is created by the user using the following command:

`createdb reconciliation_dev`

The initial data is transfer from multiple sources to the target database using the following command:

```bash
npm run db:migrate
```

## Required Environment Variables
```env
DATABASE_URL=postgresql://localhost:5432/reconciliation_dev
LOG_LEVEL=info
```

## Build/Start Commands
The API is started using the following command

```bash
npm run dev
```

The API runs locally at:

```text
http://127.0.0.1:3000
```

## Database Migration Step
The intial data is transferred from multiple sources to the database using the following command:

```bash
npm run db:migrate
```

## Deployment Order
1. Provision PostgreSQL
2. Set DATABASE_URL and LOG_LEVEL.
3. Install dependencies.
4. Run the automated test suite.
5. Run static type checking.
6. Run database migrations.
7. Build the TypesScript application.
8. Start the API process.
0. Run the reconciliation worker separately.
10. Verify API health and worker logs.