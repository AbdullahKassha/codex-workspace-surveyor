# ADR 0007: Synthetic CLI foundation

- Date: 2026-10-04.
- Status: accepted M1 implementation decision, explicitly authorized by the founder.
- Applies to: the synthetic CLI only; does not supersede ADR 0001–0006.

## Decision

Workspace Surveyor for Codex uses one private package named `codex-workspace-surveyor`, Node 24/npm 11, strict TypeScript compiled as ESM, and Node's built-in test runner. TypeScript and Node 24 typings are the only direct development dependencies; exact versions are recorded in the manifest and lockfile. There are no runtime dependencies, public library exports, bin declaration, or installation hooks. Run the built CLI through `npm run cli -- demo`.

Bundle three deliberately invented scenarios: overview, disagreement, and coverage. No input file, stdin, private-state adapter, environment discovery, filesystem inspection, network access, or subprocess execution is part of the runtime. Text is the only output. All reported paths are strings, never filesystem targets. The existing local folder, Local Project, Threads, and CWDs remain unchanged.

Use small internal readonly records for source coverage, namespace-qualified projects, synthetic threads, root/assignment/stored-CWD/UI-CWD claims, simulated directory status, and explanations. Relationships retain the original observations, including provenance and illustrative time. Fixed pure functions explain shared reported CWDs, project ambiguity, membership/CWD disagreement, and qualified missing-CWD risk. Internal types are not a public schema or source adapter contract.

Exact string equality supports only matching reported paths, never physical identity. An explicitly stipulated accessible absence can support a synthetic risk warning; inaccessible, offline, unsupported, uninspected, absent coverage, and conflicting status evidence cannot. Positive observations can remain useful under partial source coverage, but omitted observations prove nothing. Reports preserve differing measurement times and never establish migration triggers, runtime CWD, or deletion safety.

## M0 assumptions narrowed

- Reconciliation need not precede useful explanation: retain claims before canonical identity or normalization.
- The founding relationship vocabulary does not require a general graph or every entity type in M1.
- An internal interpretation result is sufficient; audit serialization, snapshots, and diffs remain deferred.
- CLI usability and metadata sufficiency (A-01/A-02) remain assumptions; invented examples do not validate real coverage or user comprehension.
- Windows-first is a validation direction. Synthetic tests certify neither real auditing nor cross-platform support.

## Evidence and limits

These are design decisions, not new Codex observations. Explanations cite WIN-001/003/004/005/006/009/015/016 as historical motivation, with counterexamples in tests. All retain B0's unknown versions and original applicability. WIN-018–WIN-020 remain separate and unimplemented. Fixtures are synthetic stipulations, not a sixth empirical evidence category or a reproduction of the founder's experiments.

Runtime CWD, internal-record classification, lifecycle reconstruction, physical identity, worktrees/Git, Project Boundary Diagnostics, configuration/instruction inspection, actions, visual UI, JSON contracts, and distribution remain deferred. No founding safety decision is reversed.

## Validation and completion

Typecheck/build, semantic counterexamples, one reviewed text golden per scenario, CLI subprocess tests, fixture-integrity checks, and source/privacy review must pass. Record runtime validation separately in [compatibility](../compatibility.md). Update current-facing documentation, retain historical evidence, and stop at M1; no commit, publication, cleanup, or M2 work follows automatically.

Revisit only when a separately authorized capability supplies a concrete consumer or evidence for richer identity, input, output, or platform behavior. Preserve this decision's synthetic-only limits when doing so.
