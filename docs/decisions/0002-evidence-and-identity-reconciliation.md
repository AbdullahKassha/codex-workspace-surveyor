# ADR 0002: Preserve evidence and separate identity namespaces

- Date: 2026-10-04.
- Status: accepted founding design decision.
- Applies to: conceptual model, future reconciliation, and advice.

## Context

**Founder evidence:** [WIN-004](../research/windows-2026-10-04.md#win-004) reports different project IDs across sources. [WIN-005](../research/windows-2026-10-04.md#win-005) reports null SQLite project IDs despite UI membership; [WIN-006](../research/windows-2026-10-04.md#win-006) reports better correspondence from global assignments. Shared CWDs and nested projects also occur.

**Unknown:** full schemas, freshness, classification, and durable membership contracts have not been validated. Historical versions are missing.

## Decision

Represent source claims with provenance and keep different identifier namespaces separate. Preserve assignment, stored CWD, runtime observation, root correspondence, and filesystem accessibility as distinct evidence. Do not force ambiguous relationships into one authoritative identity.

Keep five documentation categories: founder experiment, official documentation, design decision, assumption, and unknown. Keep confidence, severity, and action safety separate from provenance. Maintain stable observation IDs, proposed-rule references, compatibility context, and retirement criteria.

Matching roots can support correspondence but not an unconditional merge. Null fields or missing coverage must not become invented projectlessness or deletion. A runtime CWD requires execution evidence.

## Alternatives considered

- Join projects by ID: contradicted by the founder's cross-source observations.
- Declare one source universally authoritative: conceals uncertainty about freshness and schema changes.
- Merge by normalized root alone: loses duplicate/nested app identities and namespace ambiguity.
- Retain claims and conflicts: chosen to make explanations inspectable and later correction possible.

## Consequences

The eventual interface must show uncertainty, and some results will remain unresolved. Reconciliation tests need both positive examples and counterexamples. No graph database, runtime schema, or public API is introduced by this decision in M0.

## Revisit when

A validated cross-source identity contract or better supported source exists. Narrow correspondence rules with evidence; retain old experiments and append superseding results. Do not substitute a synthetic parser test for product behavior verification.

See [relationship model](../relationship-model.md), [evidence catalog](../research/evidence-catalog.md), and [compatibility matrix](../compatibility.md).
