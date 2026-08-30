# ADR-0003: Backend Framework

## Status

Accepted

## Context

The payment reconciliation system requires a backend application that exposes HTTP APIs and coordinates application services.

The backend must support:

* TypeScript.
* REST API endpoints.
* Request and response validation.
* Authentication and authorization integration.
* Database access.
* Background job creation and coordination.
* Structured error handling.
* Logging and observability.
* Automated testing.
* OpenAPI documentation.
* Maintainable separation between transport concerns and reconciliation business logic.

The backend framework should provide enough structure to support these requirements without introducing unnecessary complexity for the project's intended scale.

## Options Considered

### Option 1 — Fastify

Advantages:

* Strong support for high-performance HTTP APIs.
* Built-in schema-based validation and serialization.
* Good TypeScript support.
* Plugin-based architecture.
* Supports OpenAPI tooling.
* Lightweight and relatively unopinionated.
* Allows application and domain logic to remain separate from HTTP handling.
* Suitable for both small applications and larger modular APIs.

Disadvantages:

* Some application organization decisions must be defined by the project.
* Type integration may require additional schema or type-provider tooling.

### Option 2 — Express

Advantages:

* Simple and widely used.
* Large ecosystem of middleware and integrations.
* Broad Node.js and TypeScript tooling support.
* Flexible application structure.
* Low conceptual overhead for basic HTTP APIs.

Disadvantages:

* Provides little application architecture by default.
* Validation, serialization, error handling, and API structure require additional conventions or libraries.
* Larger applications can become inconsistent if architectural boundaries are not deliberately maintained.
* More project-specific setup is required for functionality provided directly by some newer frameworks.

### Option 3 — NestJS

Advantages:

* Provides a structured application architecture.
* Strong TypeScript support.
* Built-in concepts for controllers, services, dependency injection, guards, and modules.
* Encourages separation of concerns.
* Suitable for larger applications with multiple services and business domains.
* Can run on Express or Fastify internally.

Disadvantages:

* More framework concepts and conventions must be learned.
* Greater abstraction and boilerplate than Fastify or Express.
* May introduce unnecessary complexity for the initial project scope.
* Application structure becomes more dependent on NestJS-specific patterns and decorators.

## Decision

Fastify will be used as the HTTP backend framework for the payment reconciliation system.

The backend will use TypeScript.

Fastify will provide the HTTP transport layer, routing, request validation, response serialization, middleware/plugin integration, and API-level error handling.

Core reconciliation logic will remain outside Fastify-specific route handlers so that business behavior is not tightly coupled to the HTTP framework.

## Rationale

Fastify provides a suitable balance between structure and flexibility for the reconciliation platform.

The system requires a well-defined REST API, input validation, TypeScript support, predictable error handling, and integration with observability and API documentation.

Fastify's schema-oriented request and response handling aligns well with the API contract defined in `api-design.md`.

Compared with Express, Fastify provides stronger built-in support for validation and serialization while still remaining lightweight.

Compared with NestJS, Fastify introduces fewer framework-specific architectural concepts and allows the project to define its own application and domain boundaries without the additional abstraction required by NestJS.

The project already defines its architecture, domain model, business rules, and service boundaries independently of the HTTP framework. A lightweight framework therefore provides the required HTTP functionality without becoming the primary source of application architecture.

## Consequences

### Positive

* API routes can use structured request and response schemas.
* Request validation can occur at the HTTP boundary.
* TypeScript can be used throughout the backend.
* API documentation can be integrated with route schemas.
* The framework introduces relatively little architectural overhead.
* Core reconciliation services can remain independent of HTTP concerns.
* Fastify plugins can provide reusable infrastructure integration.

### Negative

* The project must define and enforce its own application structure.
* Dependency injection is not provided as a central architectural model.
* Additional libraries or plugins may be required for authentication, database access, and other infrastructure concerns.
* Developers must understand Fastify's plugin and schema systems.

### Follow-up Decisions

The following decisions remain separate:

* Which validation/schema library will be used.
* Which database-access library or ORM will be used.
* How application services and repositories will be organized.
* How dependency management between services will be handled.
* How authentication will integrate with Fastify.
* How OpenAPI documentation will be generated.
* How errors will be represented internally and mapped to API responses.
* How the background worker application will share domain and application logic with the API.
