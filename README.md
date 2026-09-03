# Payment Reconciliation Platform

**Financial Operations & Payment Reconciliation Platform**

Payment Reconciliation Platform is a financial operations platform for ingesting transactions, asynchronously reconciling payment and settlement records, and tracking reconciliation outcomes.

This project is being developed using a full software development lifecycle, from discovery and requirements through design, implementation, testing, deployment, and operations.

## Project Status

🚧 **In Development**

Discovery, requirements, analysis, and core design are complete. The current implementation includes PostgreSQL persistence, transaction ingestion, reconciliation job creation, background worker processing, payment and settlement matching, reconciliation result persistence, and automated tests.

Development is continuing toward a broader operational workflow, including exception handling, result retrieval, observability, deployment, and operations.

## Documentation

Project documentation is organized according to the software development lifecycle:

* [01 — Discovery](docs/01-discovery/)
* [02 — Requirements](docs/02-requirements/)
* [03 — Analysis](docs/03-analysis/)
* [04 — Design](docs/04-design/)
* [05 — Development](docs/05-development/)
* [06 — Testing](docs/06-testing/)
* [07 — Deployment](docs/07-deployment/)
* [08 — Operations](docs/08-operations/)

## Technology

The current implementation uses:

* TypeScript
* Node.js
* Fastify
* PostgreSQL
* Drizzle ORM
* Drizzle Kit
* Vitest

Additional frontend, authentication, deployment, and observability technologies will be added as those parts of the system are implemented.

## Getting Started

### Prerequisites

* Node.js
* npm
* PostgreSQL 17

### Installation

```bash
git clone https://github.com/ShamarYarde/payment-reconciliation-platform
cd payment-reconciliation-platform
npm install
```

### Environment Variables

Create a `.env` file:

```env
DATABASE_URL=postgresql://localhost:5432/reconciliation_dev
```

### Create the Development Database

```bash
createdb reconciliation_dev
```

### Run Database Migrations

```bash
npm run db:migrate
```

### Start the API

```bash
npm run dev
```

The API runs locally at:

```text
http://127.0.0.1:3000
```

### Run the Reconciliation Worker

```bash
npm run worker:reconcile
```

### Run Tests

Create the test database:

```bash
createdb reconciliation_test
```

Apply the migrations:

```bash
DATABASE_URL=postgresql://localhost:5432/reconciliation_test npm run db:migrate
```

Run the test suite:

```bash
npm run test
```

### Type Checking

```bash
npm run typecheck
```

### Build

```bash
npm run build
```

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
