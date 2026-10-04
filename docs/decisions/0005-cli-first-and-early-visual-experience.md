# ADR 0005: CLI first, with an early visual relationship milestone

- Date: 2026-10-04.
- Status: accepted founding design decision.
- Applies to: delivery order and bootstrap complexity.

## Context

**Design goal:** relationships should become visually obvious. A CLI is a practical first engineering surface for deterministic parsing, reconciliation, and evidence explanations.

**Assumption A-01:** the first audience can use a CLI. This remains a usability assumption rather than validated user research.

**Unknown:** runtime/driver choices, concrete boundaries, serialization, integration reach, and the ideal visual navigation.

## Decision

Deliver M0 documentation, then a separately approved small synthetic CLI slice, a validated Windows read-only alpha, and an early local visual report at M3. A separately approved synthetic visual prototype may begin sooner. Do not postpone visual comprehension indefinitely.

Prefer TypeScript/Node.js and one package at implementation time. Keep M0 architecture conceptual. Defer interfaces, public APIs, plugin systems, graph databases, frameworks, runtime versions, and packaging until a concrete need appears.

The visual report should use focused relationships, searchable tables/tree navigation, evidence/conflicts, coverage indicators, and before/after inspection. Reuse the audit representation once it exists. A desktop shell is not required initially.

## Alternatives considered

- Desktop UI first: increases bootstrap scope before evidence and acquisition are reliable.
- CLI-only indefinitely: does not meet the visual relationship goal.
- Full monorepo/plugin/framework setup at bootstrap: encodes untested requirements.
- Small CLI foundation followed by early visual reporting: chosen.

## Consequences

M0 contains no executable surface. Later increments can be reviewed separately. Core reasoning should remain independent of rendering and speculative plugin APIs without introducing abstractions before they are needed.

An npm CLI is the preferred first distribution candidate. Standalone executables and a desktop application are later decisions, not scaffolding requirements.

## Revisit when

Usability evidence favors an earlier visual prototype, or implementation reveals a concrete need for different technology/module boundaries. Record the reason and keep milestone authorization separate from architecture preference.

See [roadmap](../roadmap.md), [architecture](../architecture.md), and [Q-12/Q-13](../research/open-questions.md).
