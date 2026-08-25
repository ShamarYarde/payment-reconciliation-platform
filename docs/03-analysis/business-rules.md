# Business Rules

## 1. Purpose

This document defines the business rules that govern transaction reconciliation, exception handling, retries, and related operational behavior.

These rules describe the decisions the system must make independently of the final implementation, database design, or infrastructure.

The rules in this document should remain traceable to the functional requirements, non-functional requirements, and use cases defined during the requirements phase.

---

## 2. General Reconciliation Rules

### BR-001 — Eligible Records

Only valid, normalized transaction records are eligible for reconciliation.

Records that fail validation shall not participate in normal reconciliation processing until the validation issue has been resolved or the record has been corrected.

### BR-002 — Reconciliation Comparison

The system shall compare eligible records using the reconciliation rules defined for the relevant transaction sources.

A reconciliation decision must be based on the available normalized transaction data.

### BR-003 — Deterministic Results

Given the same valid input data and the same reconciliation rules, the system should produce the same logical reconciliation outcome.

### BR-004 — Currency Preservation

A transaction amount shall always be interpreted together with its currency.

Amounts in different currencies shall not be treated as equivalent unless an explicit currency-conversion rule is introduced.

No currency conversion is required for the initial MVP.

---

## 3. Matching Rules

### BR-005 — Exact Reference Match

Transactions that share the same valid external or processor reference may be considered related records.

A matching reference alone does not guarantee successful reconciliation if other required values conflict.

### BR-006 — Amount Match

Related transactions must have equal amounts to be automatically reconciled unless a specific reconciliation rule explicitly permits a difference.

### BR-007 — Currency Match

Related transactions must use the same currency to be automatically reconciled.

### BR-008 — Status Compatibility

Transaction statuses must be compatible with the expected reconciliation outcome.

For example, a successfully captured payment should not automatically reconcile against a record indicating that the same transaction failed.

The exact compatible status mappings should be defined before implementation.

### BR-009 — Successful Automatic Reconciliation

A transaction set may be marked as automatically reconciled when:

- The relevant records can be confidently associated with the same underlying transaction.
- Required identifying information matches.
- Amounts match.
- Currencies match.
- Transaction statuses are compatible.
- No unresolved duplicate condition exists.

### BR-010 — Matching Rule Identification

Every automatic reconciliation result shall identify which rule or combination of rules produced the result.

---

## 4. Exception Rules

### BR-011 — Missing Corresponding Transaction

A missing-transaction exception shall be created when an eligible transaction is expected to have a corresponding record but no matching record can be identified according to the applicable reconciliation rules.

### BR-012 — Amount Mismatch

An amount-mismatch exception shall be created when related transaction records can be identified but their required amounts differ.

### BR-013 — Currency Mismatch

A currency-mismatch exception shall be created when related records use different currencies and no supported conversion rule applies.

### BR-014 — Status Mismatch

A status-mismatch exception shall be created when related records have incompatible transaction statuses.

### BR-015 — Duplicate Transaction

A duplicate-transaction exception shall be created when multiple records unexpectedly represent the same logical transaction and the system cannot safely determine which record should be used.

### BR-016 — Invalid Data

Records that contain invalid or insufficient information required for reconciliation shall not be treated as successfully reconciled.

Where the invalid condition requires analyst attention, an appropriate exception may be created.

### BR-017 — One Primary Exception Outcome

A reconciliation attempt should have one primary exception type representing the principal reason automatic reconciliation failed.

Additional discrepancies may be recorded as supporting information.

This rule may be revisited if analysis shows that multiple simultaneous exception types need to be represented independently.

---

## 5. Duplicate Handling Rules

### BR-018 — Duplicate Submission

Receiving the same logical transaction more than once shall not create multiple independent valid transaction records unless the source data indicates that the records represent distinct transactions.

### BR-019 — Duplicate Detection

Duplicate detection may consider attributes such as:

- Source
- External transaction identifier
- Processor reference
- Amount
- Currency
- Transaction timestamp

The final duplicate-detection criteria should be defined during design based on available source identifiers.

### BR-020 — Duplicate Preservation

Suspected duplicate records should not be silently discarded if doing so would remove information needed for reconciliation or investigation.

The system should preserve enough information to explain why the duplicate condition was identified.

---

## 6. Reconciliation Job Rules

### BR-021 — Job Lifecycle

A reconciliation job shall follow a defined lifecycle.

Initial job states are:

- Pending
- Processing
- Completed
- Failed

A job shall not be considered completed until its required reconciliation work has finished successfully.

### BR-022 — Failed Job

If a system or processing failure prevents reconciliation from completing, the job shall be marked as failed rather than completed.

### BR-023 — Partial Processing

If a job processes multiple records and some records cannot be processed, the system shall preserve the successfully completed work where safe while clearly identifying the incomplete or failed work.

The exact handling of partially completed jobs should be finalized during workflow and technical design.

### BR-024 — Retry Eligibility

A failed reconciliation job may be retried when:

- The job is in a retryable state.
- The underlying failure is believed to be temporary or has been resolved.
- Retrying will not violate data-integrity rules.

### BR-025 — Retry Idempotency

Retrying a reconciliation job shall not create duplicate logical reconciliation results, exceptions, or transaction records.

### BR-026 — Retry History

Every retry attempt shall remain distinguishable in the operational or audit history.

---

## 7. Exception Lifecycle Rules

### BR-027 — Exception Creation

A reconciliation exception shall be created when the system cannot automatically reconcile records according to the applicable business rules and the condition requires investigation or operational handling.

### BR-028 — Initial Exception Status

A newly created exception shall initially have an open status.

### BR-029 — Investigation Status

An exception may be marked as under investigation when an authorized analyst begins actively handling the exception.

### BR-030 — Exception Assignment

An exception may be assigned to an authorized user responsible for its investigation or resolution.

Assignment is optional for the initial MVP unless the workflow analysis determines that it is necessary.

### BR-031 — Resolution Requirements

An exception shall not be marked as resolved unless the required resolution information has been recorded.

Required resolution information should include:

- Resolution reason
- Resolving user
- Resolution timestamp

Additional notes may be optional.

### BR-032 — Resolution History

Resolving an exception shall not remove or overwrite the original reconciliation result or exception information.

The original discrepancy and its resolution must remain traceable.

### BR-033 — Resolved Exception Modification

Changes to a resolved exception should be restricted.

If a resolved exception must be reopened or modified, the change should produce an auditable history entry.

The exact reopening workflow may be deferred from the initial MVP.

---

## 8. Audit Rules

### BR-034 — Significant Manual Actions

Significant manual actions affecting reconciliation state shall be recorded.

Examples include:

- Exception assignment
- Exception status changes
- Exception resolution
- Job retry
- Administrative changes affecting reconciliation processing

### BR-035 — Audit Attribution

Audit records for user-initiated actions shall identify the user responsible for the action.

### BR-036 — Audit Timestamp

Every audit event shall record when the event occurred.

### BR-037 — State Change History

Where relevant, audit information should preserve both the previous and resulting state of an entity.

### BR-038 — Audit Immutability

Audit history should not be modified through normal operational workflows.

Corrections should be represented through additional events rather than silently rewriting historical events.

---

## 9. Authorization Rules

### BR-039 — Analyst Permissions

An Operations Analyst may:

- View reconciliation results.
- Search reconciliation records.
- Investigate exceptions.
- Resolve exceptions where authorized.

### BR-040 — Manager Permissions

An Operations Manager may:

- Perform analyst functions.
- Review reconciliation performance.
- Review unresolved and resolved exceptions.
- Review audit information.

Additional approval responsibilities may be introduced if required.

### BR-041 — Administrator Permissions

A System Administrator may:

- Review processing failures.
- Monitor system operational status.
- Retry eligible failed reconciliation jobs.

Technical administration privileges should not automatically grant permission to alter financial reconciliation outcomes unless explicitly required.

### BR-042 — Unauthorized Actions

The system shall reject attempts to perform an operation for which the user does not have sufficient authorization.

---

## 10. Data Integrity Rules

### BR-043 — Required Transaction Identity

Every normalized transaction shall have an internal unique identifier.

### BR-044 — Source Traceability

Every normalized transaction shall remain traceable to the source from which it was imported.

### BR-045 — Financial Precision

Transaction amounts shall be represented with sufficient precision to avoid rounding errors that could change reconciliation outcomes.

The implementation must not rely on imprecise floating-point arithmetic for financial comparisons.

### BR-046 — Reconciliation Traceability

Every reconciliation result shall remain traceable to:

- The reconciliation job that produced it.
- The transaction records that were evaluated.
- The rule that determined the result.

### BR-047 — Resolution Traceability

Every manually resolved exception shall remain traceable to:

- The original reconciliation exception.
- The resolving user.
- The resolution reason.
- The time of resolution.

---

## 11. Timing and Processing Rules

### BR-048 — Processing Time

The transaction timestamp represents when the financial event occurred.

The import timestamp represents when the reconciliation system received the record.

These timestamps shall be treated as separate concepts.

### BR-049 — Late-Arriving Records

A missing corresponding transaction may later become available through a subsequent import.

The system should support reconsidering previously unmatched records when relevant new data becomes available.

The exact re-reconciliation workflow should be finalized during design.

### BR-050 — Pending Records

Records that are not yet eligible for final reconciliation due to incomplete or pending source state should not be incorrectly classified as permanent mismatches.

Where appropriate, they should remain pending until sufficient information becomes available.

---

## 12. Synthetic Data Rules

### BR-051 — Synthetic Financial Data

All financial transaction and settlement data used by the project shall be synthetic.

### BR-052 — No Real Credentials

The system shall not require real payment gateway credentials, bank credentials, card data, or financial account credentials.

### BR-053 — Representative Scenarios

Synthetic datasets should include realistic reconciliation scenarios, including:

- Successful matches
- Missing transactions
- Amount mismatches
- Currency mismatches
- Status mismatches
- Duplicate transactions
- Invalid records
- Failed reconciliation jobs

---

## 13. Rule Priority

If multiple business rules appear to apply to the same reconciliation attempt, the system should evaluate rules in a predictable order.

An initial logical priority is:

1. Validate records.
2. Detect duplicate or ambiguous records.
3. Identify related transactions.
4. Compare currency.
5. Compare amount.
6. Compare status.
7. Record successful reconciliation or create the appropriate exception.

The exact evaluation sequence should be validated during workflow analysis and may be refined before implementation.

---

## 14. Business Rule Summary

| ID | Rule Area | Summary |
|---|---|---|
| BR-001–BR-004 | General | Define reconciliation eligibility and basic invariants |
| BR-005–BR-010 | Matching | Define successful transaction matching |
| BR-011–BR-017 | Exceptions | Define reconciliation failure outcomes |
| BR-018–BR-020 | Duplicates | Define duplicate detection and handling |
| BR-021–BR-026 | Jobs | Define reconciliation job lifecycle and retries |
| BR-027–BR-033 | Exceptions | Define exception lifecycle and resolution |
| BR-034–BR-038 | Audit | Define auditable behavior |
| BR-039–BR-042 | Authorization | Define actor permissions |
| BR-043–BR-047 | Data Integrity | Define consistency and traceability rules |
| BR-048–BR-050 | Timing | Define timestamp and late-arrival behavior |
| BR-051–BR-053 | Synthetic Data | Define demonstration-data boundaries |

---

## 15. Open Business Questions

The following questions require further analysis before implementation:

1. Which transaction identifiers are authoritative for each simulated source?
2. How close may transaction timestamps be while still representing the same transaction?
3. Should date or timestamp tolerance participate in matching?
4. Can one payment transaction correspond to multiple settlement records?
5. Can multiple payment records legitimately correspond to one settlement record?
6. Should partial settlements be supported in the MVP?
7. How should refunds affect reconciliation?
8. Should an analyst be able to manually match transactions?
9. Should resolved exceptions be reopenable?
10. Should exceptions have severity levels?
11. Should reconciliation rules be configurable or fixed for the MVP?
12. How long should the system wait before classifying a missing counterpart as an exception?
13. How should late-arriving records affect previously created exceptions?

These questions should be addressed during workflow analysis and architecture/design where appropriate.

---

## 16. Traceability

Business rules should remain traceable to the requirements and use cases they support.

Examples:

| Business Rule | Related Requirement / Use Case |
|---|---|
| BR-009 Successful Automatic Reconciliation | FR-005, FR-006, UC-002 |
| BR-012 Amount Mismatch | FR-007, UC-002, UC-005 |
| BR-025 Retry Idempotency | FR-011, FR-012, UC-007, NFR-005 |
| BR-031 Resolution Requirements | FR-010, UC-006 |
| BR-038 Audit Immutability | FR-017, UC-010 |
| BR-045 Financial Precision | NFR-007 |
| BR-049 Late-Arriving Records | UC-002, UC-005 |

The traceability matrix may be expanded later as implementation and test artifacts are introduced.