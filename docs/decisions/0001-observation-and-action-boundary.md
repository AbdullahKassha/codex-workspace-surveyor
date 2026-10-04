# ADR 0001: Separate observation from action

- Date: 2026-10-04.
- Status: accepted founding design decision.
- Applies to: M0 documentation and future product safety boundaries.

## Context

**Founder evidence:** [WIN-007 through WIN-010](../research/windows-2026-10-04.md) show separate lifecycle effects for threads, projects, internal rows, and managed worktrees. [WIN-015 through WIN-017](../research/cwd-migration.md) show a migration that succeeded through UI assignment and a subsequent turn rather than direct state edits.

**Official documentation:** [DOC-001](../research/evidence-catalog.md#doc-001-app-server-listing-side-effects) shows why even supported read-sounding methods need side-effect assessment.

**Unknown:** a durable supported mechanism for every desired organization action has not been established.

## Decision

Use observe, explain, guide supported action, and re-observe. Workspace Doctor must not directly mutate Codex-owned SQLite databases or Codex-owned JSON state. This prohibition is unconditional; any reversal requires an explicit superseding decision/ADR. The first CLI is read-only and offers manual guides, not a cleanup/migration executor.

Codex changing its own state through supported workflows is distinct from Workspace Doctor directly editing that state. Supported actions still require side-effect assessment and do not create an exception to the prohibition.

Private acquisition copies are acceptable in principle, subject to separate validation and privacy handling. No acquisition is implemented in M0. Private research and state-changing experiments require specific authorization; milestone approval is not blanket authority.

Do not commit, publish, or clean as an incidental part of an implementation slice.

## Alternatives considered

- Direct state editing: potentially fast, but undocumented ownership and lifecycle make consistency and recovery unreliable.
- Automatic action execution through a supported interface: may be useful later, but needs capability, side-effect, and failure validation.
- Explanation and manual guidance: chosen initially because incomplete knowledge can be surfaced without silently changing state.

## Consequences

Some issues will receive guidance rather than a one-click fix. A user can inspect why a workflow is proposed and what evidence is missing. Supported operations still need scoped authorization and verification.

A verification turn is a state-changing execution event, not a scanner read. Snapshots capture evidence and are not backups.

## Revisit when

A concrete supported action exists with documented semantics, validated preconditions, recoverability, and an explicit implementation scope. Add a superseding ADR for action capability; do not erase this historical boundary. Adding supported actions or fixing a Codex behavior does not authorize direct state mutation. Reversing the direct-mutation prohibition requires an explicit superseding decision/ADR that states the reversal; implementation authorization remains separate.

See [safety and privacy](../safety-and-privacy.md).
