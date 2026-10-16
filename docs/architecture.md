# Conceptual architecture

## Current architecture, 2026-10-16

The founder-supplied accepted baseline `2a12ecf9fa757b6f1a32adec60892620f06acee3` uses the reusable memory-only browser with explicit protected closed-app acquisition. Relaunch attaches to an existing successful snapshot without Refresh; an empty eligible session requests one attempt. Recovery validation and a bounded Desktop closure preflight precede acquisition setup. The helper's retained-source, verification, disposal and authenticated-cleanup gates remain authoritative; discovery completes before replacement publication. Failed/cancelled refreshes preserve the previous view.

Browser reload reconnects with an ephemeral tab credential; it neither acquires data nor extends the snapshot's freshness. No durable authorization, persisted dataset or export is implemented. The standalone one-use entry remains separate. The [live-copy prototype is test-only and production NO-GO](research/live-acquisition-feasibility.md#final-best-effort-feasibility-gate--2026-10-15).

The dated architecture/preparation sections below preserve earlier boundaries. In particular, the original standalone “no refresh” statement applies to that entry, and the original Phase 2A launch-refresh behavior is superseded only by the [Phase 2B change](research/explorer-local-read-only-validation.md#phase-2b-friction-reduction-2026-10-15). Use [Getting started](getting-started.md) for current operations.

**Historical applicability checkpoint, 2026-10-15:** the [accepted baseline and priorities](roadmap.md#current-position-and-priorities-2026-10-15) supersede earlier preparation-status wording below. Reusable Phase 2A sessions/explicit Refresh and conditional instruction-metadata enrichment are delivered; source acquisition still requires Desktop closure. Live-friendly feasibility is not an architecture commitment or a safety-gate change. Phase 2B will be reassessed against remaining friction, not automatically activated by 2A completion. Persisted audit/diff systems and optional integrations remain deferred technical tracks; distribution choices belong to M4 planning.

## Accepted standalone slice, 2026-10-10

The accepted path is selected sources → protected acquisition and separate analysis copies → bounded allowlisted readers → evidence-bearing reconciliation → optional bounded filesystem/Git enrichment → pure presentation → short-lived loopback browser. Enrichment and delivery occur after successful coordinator source verification, helper exit and authenticated copy cleanup. The browser snapshot lives in memory; no export, refresh or persistence is implemented.

`src/explorer` contains readers, model, discovery, presentation, view and server. The standalone entry and protected acquisition coordinator remain private under test support; the bundled CLI remains synthetic. Discovery reads metadata with ancestor/reparse protection and finite dispatch limits; it invokes no Git command. Qualified Git references may nominate external exact paths, never whole-disk enumeration. Source/assignment classification, conservative path comparison and unknown evidence remain separate from presentation. The approved browser is a light vertical relationship tree with compact Details and Diagnostics, not a filesystem inventory.

[Current validation](research/explorer-local-read-only-validation.md#accepted-milestone-2026-10-10) records the accepted scope and its limitations. The sections below retain their named historical stages or describe deferred outcomes; old exact-string-only, unavailable-Project and deferred-Git statements do not describe the current explorer.

## Phase 2A preparation, 2026-10-11

The approved reusable path adds a session controller and separate loopback server interface alongside the accepted standalone path. UI startup performs pure source nomination, not acquisition. Each launch or authenticated Refresh requests one serialized attempt; protected acquisition/disposal/cleanup precedes scoped discovery and candidate publication. Cancellation suppresses publication and subsequent discovery dispatch, while close/expiry disables commands and waits for acquisition cleanup. The previous successful dataset remains in memory during refresh failures. A host restart starts empty.

A session-child PowerShell 7 managed pipe owns the current-user rendezvous for its lifetime. First-instance ownership, same-user controls at both ends, exact version/selection checks and bounded messages coordinate relaunch without files, retries or an installed service. Pipe loss closes the Node host after cleanup; occupied recovery controls are not bypassed. The reusable browser stores only its ephemeral credential in tab-scoped storage, reconnects on reload, and receives bounded authenticated state events. Events/reads never refresh or extend idle time. Entity IDs are qualified by frozen source scope; folder restoration additionally needs exact observed filesystem identity. Durable authorization and registry primitives are intentionally deferred until 2A acceptance/review. See [implementation validation](research/explorer-local-read-only-validation.md#phase-2a-reusable-session-2026-10-11).

## M3a concrete browser preparation

Under [ADR 0014](decisions/0014-named-threads-and-local-projects.md), the private synthetic acquisition bridge supplies owned analysis copies → fixed source-specific readers → evidence-bearing snapshot → pure exact-string reconciliation → short-lived loopback browser. Core `src/explorer` modules import no fixtures, helper protocols, opt-ins or canary entries. Product CLI remains the M1 demonstration. Historical architecture below retains its milestone context.

The browser is a focused Projects/Locations explorer, not an all-nodes graph. Thread and Project identities have separate source namespaces; relations retain stored evidence versus exact-string derivation. Unclassified records, unknown membership and uninspected locations remain visible. Repository/worktree adapters and unused entity scaffolding are deferred.

The managed acquisition boundary remains private under test support. Its concrete new profile adds one explicitly selected JSON file and expands authenticated recovery inventory while preserving old profiles. No generic provider/plugin architecture or public acquisition interface is introduced. The one-use snapshot is delivered only after source/copy verification, helper exit and authenticated cleanup. Loopback delivery is separately permissioned for future personal use; no personal browser entry is enabled. See [M3a preparation](research/m3a-explorer-preparation.md).

## Direction: design decisions

M0 selected TypeScript/Node.js and one package as the implementation direction, without creating a runtime package or contracts. M1 follows that direction. Introduce concrete module boundaries only when working code needs them; no public API, registry, dependency-injection system, or framework is established.

## M1 implementation: design decisions

The authorized synthetic slice now uses one private TypeScript/Node package: bundled observations → retained relationships → fixed pure explanation functions → text rendering. The CLI selects a named bundled scenario and writes terminal output only. No source discovery or reconciliation adapter exists. See [ADR 0007](decisions/0007-synthetic-cli-foundation.md).

Internal readonly types represent namespace-qualified projects, threads, sources/coverage, root and assignment claims, stored/UI CWD reports, simulated directory statuses, and explanations. Relationships retain the observations rather than forcing canonical identities. Exact path-string equality only supports matching reported paths; directory physical identity remains unresolved. Missing or conflicting observations are never filled from the local environment.

Flat modules separate the command/entrypoint, model, scenario data, interpretation, and text renderer. TypeScript targets ES2023 with NodeNext ESM and strict checks. Node 24/npm 11, exact development dependencies, and Node's built-in test runner are the implementation baseline. Tests and golden text remain separate from runtime imports. There are no runtime dependencies, public exports, bin declaration, schemas, adapter/rule registries, or stable serialized contracts.

The remaining conceptual sequence describes later authorized capabilities, not implemented M1 behavior:

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

## M2a.1 implementation: design decisions

An internal test-only harness under `test/support` constructs invented SQLite/JSON files, selects fixed fixture names, bounds raw source reads/copies, retains before/after measurements, and separates untouched acquisition bytes from SQLite analysis copies. Its wrapper removes exact current-run synthetic artifacts on success and handled refusal, reporting residuals separately. The CLI does not import this harness or accept external inputs.

Default acquisition refuses because native scratch protection is unverified. Explicit simulated protection exercises invented copying mechanics; it is not a permission certification. Node's built-in SQLite is evaluated only for fixture construction and analysis, not adopted as a real adapter. No driver dependency, helper, production architecture or public audit contract is added. See [ADR 0008](decisions/0008-synthetic-acquisition-kernel.md) and [validation](research/synthetic-acquisition-validation.md).

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

M1 runtime, test tools, and synthetic command/exit-code conventions are recorded in ADR 0007 and the README. SQLite driver, scratch acquisition mechanics, path identity primitives, real audit commands, serialization, and distribution remain undecided until their milestone. A familiar database filename is insufficient for schema compatibility. A supported API must be assessed for side effects before use.

The [research gates](research/open-questions.md) and [safety requirements](safety-and-privacy.md) determine what must be validated first.

## Integration and distribution: design decisions

The core product must work independently of speculative plugin APIs. A later skill could explain results; a local MCP wrapper might expose bounded operations after host access and side effects are validated. Neither is needed for M0 or the initial synthetic CLI.

An npm CLI is the preferred first distribution candidate. Standalone executables, a desktop shell, and GitHub releases require later packaging and release decisions. No monetization infrastructure is planned.

See [ADR 0005](decisions/0005-cli-first-and-early-visual-experience.md) and the [roadmap](roadmap.md).
