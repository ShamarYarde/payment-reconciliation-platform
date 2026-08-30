# ADR-0002: Monetary Value Representation

## Status

Accepted

## Context

The payment reconciliation system compares financial amounts from multiple transaction and settlement sources.

Monetary values must be represented exactly because reconciliation decisions may depend on direct amount comparisons.

Binary floating-point representations can introduce rounding errors and should not be used for authoritative monetary calculations or comparisons.

The selected representation must work consistently across:

* API requests and responses
* Application logic
* Reconciliation rules
* Database persistence
* Automated tests

The project currently uses synthetic financial data, but the implementation should follow practices appropriate for financial-style systems.

## Options Considered

### Option 1 — Integer Minor Units

Represent monetary values as integers in the smallest supported currency unit.

Examples:

```text
USD 125.50 → 12550
USD 1.25 → 125
```

Advantages:

* Exact integer comparisons.
* Avoids binary floating-point rounding errors.
* Simple reconciliation equality checks.
* Works naturally with JavaScript and TypeScript integer arithmetic for values within safe integer limits.
* Straightforward to serialize through JSON APIs.

Disadvantages:

* The application must know how many minor units each currency uses.
* Not every currency uses two decimal places.
* Conversion between display values and stored values must be handled consistently.
* Large values must remain within the runtime's safe integer range or use another integer representation.

### Option 2 — Exact Decimal Values

Represent monetary values using an exact decimal type in the database and an exact decimal representation in application code.

Example:

```text
USD 125.50 → 125.50
```

Advantages:

* Represents monetary values in a form closer to how users normally read them.
* PostgreSQL `NUMERIC` supports exact decimal storage.
* Can support currencies with different decimal precision.
* Avoids binary floating-point rounding errors when exact decimal libraries or types are used consistently.

Disadvantages:

* JavaScript does not provide a built-in arbitrary-precision decimal type.
* Application code would require a decimal library or string-based conversion strategy.
* Values returned by database libraries may require explicit parsing or conversion.
* Consistency must be maintained across the database, API, and application layers.

## Decision

The system will represent monetary values using integer minor units in the application and API.

For example:

```json
{
  "amountMinor": 12550,
  "currency": "USD"
}
```

represents:

```text
USD 125.50
```

The database will store the amount using an exact integer type capable of supporting the expected value range.

Currency will always be stored alongside the monetary amount.

## Rationale

Integer minor units provide a simple and deterministic representation for the reconciliation system.

The core reconciliation workflow frequently requires exact equality comparisons between transaction amounts. Integer comparison avoids the rounding behavior associated with binary floating-point values and does not require an additional decimal arithmetic library for the initial implementation.

The representation also maps cleanly to JSON and TypeScript application code.

The system will not assume that every currency has exactly two decimal places. Currency metadata or a defined currency rule will determine how minor-unit values are converted for display and input.

This approach is appropriate for the initial project scope, where the primary monetary operations are comparison, storage, aggregation, and display rather than complex financial calculations involving interest or exchange-rate arithmetic.

## Consequences

### Positive

* Reconciliation amount comparisons can use exact integer equality.
* The API has a clear and consistent monetary representation.
* Application code avoids binary floating-point money comparisons.
* Automated tests can use deterministic monetary values.
* No decimal arithmetic dependency is required for basic reconciliation.

### Negative

* Display values must be converted between minor units and formatted currency values.
* Currency-specific decimal rules must be handled explicitly.
* The implementation must avoid exceeding JavaScript's safe integer range.
* Complex future calculations may require arbitrary-precision decimal arithmetic.

### Follow-up Decisions

The following decisions remain separate:

* Which integer type will be used in PostgreSQL.
* How currency minor-unit metadata will be represented.
* How monetary values will be formatted in the user interface.
* How input values will be converted into minor units.
* Whether future calculations require an arbitrary-precision decimal library.
* How currencies without standard fractional units or with three fractional digits will be handled.
