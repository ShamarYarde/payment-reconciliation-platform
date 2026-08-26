# Workflows

## 1. Purpose

This document defines the primary business workflows for the payment reconciliation system.

The workflows describe how transaction data moves through ingestion, validation, reconciliation, exception handling, resolution, retry, and operational review.

They are intended to clarify process behavior and decision points before implementation and system design.

---

## 2. Workflow Overview

The core reconciliation lifecycle is:

```mermaid
flowchart TD
    A[Transaction Data Received] --> B[Validate and Normalize]
    B --> C{Valid?}

    C -- No --> D[Record Validation Failure]
    C -- Yes --> E[Create or Queue Reconciliation Work]

    E --> F[Run Reconciliation]
    F --> G{Related Record Found?}

    G -- No --> H[Evaluate Missing Record Condition]
    G -- Yes --> I{Duplicate or Ambiguous?}

    I -- Yes --> J[Create Duplicate Exception]
    I -- No --> K{Currency Matches?}

    K -- No --> L[Create Currency Mismatch Exception]
    K -- Yes --> M{Amount Matches?}

    M -- No --> N[Create Amount Mismatch Exception]
    M -- Yes --> O{Status Compatible?}

    O -- No --> P[Create Status Mismatch Exception]
    O -- Yes --> Q[Mark Reconciled]

    H --> R{Should Exception Be Created?}
    R -- Yes --> S[Create Missing Transaction Exception]
    R -- No --> T[Remain Pending]

    J --> U[Exception Investigation]
    L --> U
    N --> U
    P --> U
    S --> U

    U --> V[Resolve or Defer Exception]
```