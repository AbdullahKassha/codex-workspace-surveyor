# Conceptual architecture

## Direction: design decisions

Prefer TypeScript/Node.js and one package when implementation begins. M0 creates no runtime package, public API, registry, schema, dependency-injection system, or framework. Introduce concrete module boundaries only when working code needs them.

```text
Explicit scope and source observations
                  |
                  v
Path and identity reconciliation
                  |
                  v
Relationships retaining evidence and conflicts
                  |
                  v
Conservative findings and organization advice
                  |
                  v
CLI, snapshots, sanitized reports, and early visual explanations
```

This is a conceptual processing sequence, not a committed interface contract.

## Responsibilities: design decisions

Source handling will discover bounded, explicitly selected sources, identify supported shapes, and emit observations and coverage failures. Reconciliation will compare paths and identifiers while preserving unresolved or conflicting claims. Advice will require explicit evidence prerequisites. Presentation will explain evidence and privacy choices without changing the underlying conclusions.

Keep platform-specific discovery and path behavior separate from portable reasoning when a concrete boundary is needed. Windows-first behavior must not leak into a future macOS implementation as an undocumented default.

Candidate initial sources are validated global-state fields, recognized SQLite thread metadata, and filesystem checks at referenced paths. Optional Git/worktree inspection stays bounded. Session indexes and rollout parsing remain deferred. See [source assessment](research/state-sources.md).

Project Boundary Diagnostics is a later explanatory use of evidence-bearing relationships, not a new framework or prerequisite for the synthetic CLI. Bounded marker/configuration/Git/instruction evidence needs separate M2-or-later research and implementation authorization. M0 defines vocabulary only; no boundary classes, runtime schemas, public APIs, configuration adapters, or instruction-loader machinery are established. See the [relationship distinctions](relationship-model.md#project-boundary-distinctions-design-decisions) and [roadmap](roadmap.md#m1).

## Audits and snapshots: design decisions

A future audit should record the tool/rule versions, platform and available Codex version context, acquisition interval, consistency, source coverage, relationships, findings, and evidence. Define its serialization during implementation; M0 establishes no public wire format.

A snapshot captures observations, not a recoverable backup. Private snapshots may retain source identities for local comparison. Shareable reports use report-local aliases and should not silently be treated as comparable private snapshots.

Diffs must distinguish newly observed entities, entities no longer observed, relationship changes, coverage loss, and interpretation changes caused by tool/rule updates. Partial observation cannot prove deletion. Neither a snapshot nor an audit can restore Codex state.

## Deferred implementation choices: unknowns

Runtime versions, SQLite driver, scratch acquisition mechanics, path identity primitives, CLI options/exit codes, serialization, and test runner remain undecided until their milestone. A familiar database filename is insufficient for schema compatibility. A supported API must be assessed for side effects before use.

The [research gates](research/open-questions.md) and [safety requirements](safety-and-privacy.md) determine what must be validated first.

## Integration and distribution: design decisions

The core product must work independently of speculative plugin APIs. A later skill could explain results; a local MCP wrapper might expose bounded operations after host access and side effects are validated. Neither is needed for M0 or the initial synthetic CLI.

An npm CLI is the preferred first distribution candidate. Standalone executables, a desktop shell, and GitHub releases require later packaging and release decisions. No monetization infrastructure is planned.

See [ADR 0005](decisions/0005-cli-first-and-early-visual-experience.md) and the [roadmap](roadmap.md).
