# Milestone roadmap

**Current M3a supplement, 2026-10-07:** [PLD-001](research/personal-local-display-observation.md) records the completed personal terminal display (146 claims, 15 groups, reported cleanup), completing M2 private validation with its limitations intact. Stop TUI development. [M3a preparation](research/m3a-explorer-preparation.md) under [ADR 0014](decisions/0014-named-threads-and-local-projects.md) moves to a useful named-record/Project browser with synthetic fixtures. Real Project registry keys/types remain unqualified and its capability unavailable. The next personal scope should combine exact-source qualification, selected metadata and local browser delivery after review; none is authorized now. Repository/worktree enrichment follows only at separately approved known roots. Earlier current-status paragraphs remain historical.

## Authorization: design decision

**Current local-display preparation supplement, 2026-10-07:** record [PMAP-001](research/personal-thread-cwd-observation.md), the completed summary-only private map at intended commit `b1449d8`; its authorization is consumed. Prepare the [local terminal viewer](research/local-thread-cwd-display-preparation-validation.md) under [ADR 0013](decisions/0013-local-thread-cwd-display-preparation.md) using invented protected copies only. This is the smallest human-readable step: exact stored-CWD groups and opaque IDs with explicit provenance/coverage, escaped arbitrary strings and no persistence/export. No retained map can be reused; independent review and a fresh acquisition/read-and-display authorization precede any personal view. Projects, worktrees, filesystem validation, a visual explorer and M2c remain separately gated.

**Current MAP preparation supplement, 2026-10-07:** prepare the [summary-only personal map path](research/personal-thread-cwd-preparation-validation.md) under [ADR 0012](decisions/0012-personal-thread-cwd-map-preparation.md), using synthetic fixtures only. The existing adapter is complete at `4f5a4f2`; separate test teardown hardening is committed at `ee7bd07`. This slice adds fixed invocation, local visible input and explicit attempt-consumption reporting. Independent review and fresh actual-value/full-copy consent precede any real map. Actual-value display, retention, exports and a visual explorer remain later separately reviewed scope; no earlier personal authorization is reusable.

**Current supplement, 2026-10-07:** the founder reported the completed personal qualification in [PSQ-001](research/personal-qualification-observation.md). Only documentation and [synthetic adapter preparation](research/thread-cwd-adapter-validation.md) under [ADR 0011](decisions/0011-thread-cwd-adapter-preparation.md) are now approved. The two-field map needs actual ID/CWD strings but no extra source columns; the completed qualification returned no such strings. Independent review and new actual-value consent precede any personal map. No rerun, M2c, UI, discovery or classification is authorized. Earlier milestones and records retain their historical boundaries.

**Current supplement, 2026-10-06:** [PCAN-001](research/personal-canary-observation.md) records the founder's successful separately authorized closed-app canary report: three files, readability and source stability passed, helper exit confirmed, scratch/recovery controls reported removed, exit code 0, no separate recovery. The intended implementation was `44453cd`; the result itself does not attest its commit or runtime. The personal authorization is consumed. Only documentation and synthetic preparation of the bounded schema/metadata qualification gate are now authorized; independent review and fresh personal consent precede another acquisition. Earlier status statements below remain dated historical context.

The roadmap describes planned outcomes. It does not authorize implementing all milestones in one run. M0, M1 and M2a.1–M2a.4 are complete; M2a.4 passed independent review and was committed. On 2026-10-05 the founder separately authorized only the isolation-feasibility slice of Disposable Real Codex Validation: targeted read-only host checks, official research and documentation. The result is a documented readiness gap; no environment was created or Codex launched. Every subsequent setup, execution or acquisition gate requires separate scoped approval. Private-state research also needs specific authorization identifying what will be read and why.

On 2026-10-06 the founder approved [personal closed-app canary preparation](research/personal-canary-preparation-validation.md) with synthetic validation only. [ADR 0009](decisions/0009-personal-closed-app-canary.md) permits a separately consented personal canary without requiring VM setup. The readiness-gap record is preserved; personal execution remains deferred until independent review and exact single-run consent.

The separately approved P1/P2 preparation correction adds authenticated persistent recovery before source-content reads, exclusive exact-run restart cleanup and pre-spawn request validation with retained lifecycle ownership. Its checkpoint passed 171 with no skips; the ordinary run passed 78 with 93 skips. Subsequent review identified receive-deadline release during Node deletion. The separately approved remaining P1 fix keeps Node identity authorization and moves each synchronous recovery scratch deletion into the exclusive-handle helper; deadlines and protocol failures stop subsequent dispatch. Resolved P2 and existing timeouts remain unchanged. Independent re-review remains pending. No actual personal slot, source or Codex process was inspected, and graceful synthetic recovery does not establish crash or power-loss durability.

Final lifetime-correction validation passed **179** explicit synthetic tests with no skips and **79** ordinary tests with **100** skips, with zero failures and typecheck/build passing. Controlled deadline crossing and concurrent recovery demonstrate the corrected scratch-deletion lifetime only; no personal execution or subsequent gate is authorized.

Commits, publication, visibility changes, and cleanup require separate authorization. Approval of product direction is not approval for those actions.

<a id="m0"></a>
## M0: Foundation

Deliver README, AGENTS.md, product/architecture/relationship documentation, the original 17 sanitized observation records and separate WIN-018–WIN-020 boundary-research group, evidence catalog, compatibility matrix, safety/privacy requirements, five founding ADRs, qualified workflows, roadmap, contribution/security guidance, and hygiene files.

Use only supplied observations, official documentation, and synthetic examples. No private Codex reads, package initialization, dependency installation, implementation code, runtime schemas/APIs, empty source scaffolding, or release automation.

Completion checks: document-only scope; privacy review; relative links/anchors; original WIN-001 through WIN-017 traceability and separate WIN-018–WIN-020 traceability; distinct claim categories; explicit historical version gaps; future validation and retirement fields; README accurate about missing executable capabilities.

Report created files, checks, and unresolved research questions. Stop.

<a id="m1"></a>
## M1: Synthetic CLI foundation

The separately authorized slice implements a single private TypeScript/Node package with bundled invented inputs, evidence-bearing relationships, and conservative text output. [ADR 0007](decisions/0007-synthetic-cli-foundation.md) records the minimal model, fixed explanation functions, and tooling. No public APIs, registries, or frameworks are introduced.

M1 is synthetic-only. It categorically excludes discovery of real local Codex state, real Codex adapters, App Server startup for inspection, reads of personal Codex state, and any private-state acquisition. Approval of M1 does not authorize these activities. Any proposed departure requires separate explicit authorization specifying the activity and revising the scope before work begins.

Project Boundary Diagnostics does not expand M1's implementation scope. M1 also excludes real boundary discovery algorithms, real filesystem ancestry scans, configuration adapters, Git discovery/classification, AGENTS content inspection, instruction-loader emulation, verification turns, and boundary-specific UI. Boundary diagnostics is deferred beyond M1 and must not block the initial CLI foundation.

Acceptance: a synthetic example explains shared CWDs, differing ID namespaces, unknown membership, and missing-path uncertainty. Counterexamples prevent false corruption labels. No excluded discovery, adapter, startup, personal-state read, or private acquisition is performed.

The implemented development surface is `npm run cli -- demo`, with `overview` (the default), `disagreement`, and `coverage` scenarios. [ADR 0006](decisions/0006-project-naming-and-cli-surface.md#m1-development-surface-design-decision) defines the accepted naming. Use the [README commands](../README.md#run-the-synthetic-demonstration) to install the exact development dependencies, build, and run tests. There is no external input, JSON output, public bin declaration, or globally installed command. The existing local folder, Local Project, Thread assignments, and CWDs remain unchanged; rename and migration work are excluded.

Completion requires a fresh dependency install, typecheck, build, semantic/counterexample tests, fixture checks, three reviewed text goldens, CLI tests, and documentation/privacy review. Synthetic validation does not reproduce WIN experiments or certify any Codex build. Record results separately in [compatibility](compatibility.md#m1-synthetic-implementation-validation). Report delivered files, checks, and unknowns, then stop before M2 without committing or publishing.

<a id="m2"></a>
## M2: Private Windows read-only alpha

The broader direction is approved in principle. M2a.1–M2a.4 and isolation feasibility are complete. Personal canary preparation is separately approved; no real experiment is authorized. Preserve the following gates; do not interpret approval of the direction as authority to execute them together.

| Gate | Scope and exit condition |
| --- | --- |
| M2a.1 — synthetic kernel | Invented SQLite/JSON fixtures, explicit selection, bounded raw acquisition, ownership/containment/stability, existing WAL/SHM, analysis separation, conservative refusal, exact synthetic cleanup, privacy/source-write regression tests; stop with limitations recorded |
| M2a.2 — Windows acquisition controls validation | Supported Node mode/access and two-handle sharing probes on bounded invented files; document established observations, capability gaps and unknowns while retaining native refusal |
| M2a.3 — minimal Windows helper experiment | Test-only managed PowerShell 7 DACL and retained FileShare.Read controls on bounded synthetic fixtures; record descriptors, cross-process sharing and cleanup evidence; leave native refusal unchanged |
| M2a.4 — synthetic helper integration | Explicit test-only protected SQLite/JSON/WAL/SHM copying under retained handles, separate analysis, final verification and authenticated cleanup; native refusal remains unchanged; independent review before any next proposal |
| Subsequent stronger validation | Separate proposal and approval after independent review; synthetic integration never authorizes real acquisition |
| Disposable Codex isolation feasibility | Authorized read-only host checks and documentation; complete with a precise setup proposal or readiness gap, without creating an environment or launching Codex |
| Disposable environment setup and test-only source binding | Subsequent explicit proposal/approval; resolve the feasibility gap, establish isolation and separate Codex originals from scratch ownership before any acquisition |
| Disposable Codex validation | Separately authorize creation, closed-app acquisition and copied-only inspection; CLI first, exact named sources/actions, current source/schema evidence; Desktop deferred |
| M2b — first real adapter | Separately implement minimum metadata reading using validated evidence; unsupported shapes withhold dependent conclusions |
| Personal canary preparation | Approved private runner/helper, persistent authenticated recovery with helper-owned synchronous deletion, pre-spawn validation, invented-file checks and external-run procedure; independent re-review before any personal execution |
| Personal closed-app canary | Separate exact single-run consent; full copies, schema-only analysis, verified closure, retained read handles and exact scratch cleanup; no VM prerequisite, no automatic adapter |
| Bounded schema/metadata qualification | [ADR 0010](decisions/0010-copied-schema-qualification.md) and [synthetic validation](research/personal-qualification-preparation-validation.md): fixed candidate schema, projected metadata excluding defaults, and one type/nullness sample only; independent review and separate fresh personal-run consent before execution; no M2b authorization |
| M2c — conservative audit | Separate real CLI integration with provenance, qualified source coverage and text explanations |
| Git/worktree mapping | Deferred; a later bounded proposal must assess side effects and ownership limits |

M2a.1 uses only existing dependencies and a test-only harness. Native protection refuses; copying tests explicitly simulate the permission prerequisite. It excludes full-disk exhaustion, forced crashes, real concurrent Codex writers, process tracing, aggressive live replacement races, disposable Codex experiments and personal reads. See [ADR 0008](decisions/0008-synthetic-acquisition-kernel.md) and [validation](research/synthetic-acquisition-validation.md).

M2a.2 uses one test-only module and fresh invented control-probe files. Deliberate bounded writes, one rename/unlink and exclusive-creation probes measure ordinary Node handle behavior separately from acquisition source-write regressions. [Validation](research/windows-acquisition-controls-validation.md) records the observed writer/namespace exclusion gap and unverified DACL protection. A demonstrated gap completes this gate; it never enables acquisition or authorizes a helper, alternate-account test, competing subprocess or later Codex experiment.

Private snapshots, sanitized export formats and diffs remain future work requiring another scoped proposal. They are not acceptance prerequisites for the minimal M2 alpha. No real-state reads, real adapter or audit integration follow automatically from M2a.1 success.

M2a.3 uses only the explicitly selected installed PowerShell 7 host and supported .NET APIs, with no compilation, new dependencies, elevation or policy changes. [Helper validation](research/windows-helper-experiment-validation.md) records the current-user-only descriptor policy and controlled competing Node handles. Other-account effective access, hostile races and database/companion atomicity remain unknown. Native acquisition continues to refuse. Independent review precedes an integration proposal; separate approval precedes its execution. Disposable Codex and personal sources remain later gates.

M2a.4 reuses that helper only through an explicitly opted-in test coordinator. Node constructs the unchanged fixtures, selects fixed source names, checks identity/stability, analyzes separate copies and cleans the authenticated run. The helper verifies protected scratch and retains all selected deny-write/delete read handles until copying, analysis and final verification finish. Integration limits are 128 KiB per file, 256 KiB/five selected files, and 21 files/six directories/1 MiB across the entire run. The earlier helper probes retain their smaller limits. [Integration validation](research/synthetic-helper-integration-validation.md) records results separately from Codex evidence. This gate does not prove atomic database/WAL/SHM acquisition, hostile-race resistance or real-source readiness. A reviewed success may justify a later disposable-Codex proposal; it grants no authority to execute one.

M2 or later may validate real boundary evidence only with separate, specific research and implementation authorization. This optional scope includes bounded marker/policy, qualified Git-root, and instruction-metadata evidence; it does not authorize full private configuration, instruction contents, or arbitrary ancestry scans. No instruction interpreter, Git repair, marker management, or configuration repair is planned.

Acceptance: evidence/context recorded, no source mutations, partial scans qualified, private canaries absent from shareable outputs, and all claims scoped to tested environments. Live scanning remains experimental until separately validated.

### Disposable Codex isolation feasibility: completed gap outcome

The [feasibility record](research/disposable-codex-isolation-feasibility.md) separates dated host observations from official contracts and future design. The observed Core edition, absent Sandbox launcher, no candidate VM executable in the bounded checked locations and unavailable hardware queries do not establish an installed supported environment. They do not prove system-wide absence. No environment, credentials, Codex process or source was created or inspected. Fresh Windows VM isolation remains a conditional candidate, with installation/setup and hardware/network prerequisites requiring a subsequent proposal.

Later phases remain distinct: create CLI-only disposable state; acquire exact named files after verified writer closure; inspect only protected analysis copies. M2a.4's fixed synthetic selection/schema and source-owning cleanup require separately reviewed test-only adaptation before real disposable originals can be bound. No automatic limit increases, production interface, general native acquisition, personal canary or M2b/M2c follows. Historical M2a.1–M2a.4 records stay unchanged.

<a id="m3"></a>
## M3: Early visual relationship report

This is an explicit early product milestone after the read-only alpha, not an indefinite future idea. A separately approved synthetic prototype may begin earlier if it helps comprehension.

Build a local self-contained relationship report with a project/directory overview, searchable threads, selected-entity relationships, evidence/conflicts, coverage indicators, and before/after inspection. Prefer focused graphs and accessible tables/tree navigation to a graph of every record. No desktop shell or external assets are required by this outcome.

M3 may visualize validated boundary relationships after separately authorized research: app roots, CWD observations, discovery boundaries, marker evidence, Git roots, and instruction eligibility/selection uncertainty. This is optional evidence-based scope, not a dependency of the initial CLI or permission to emulate instruction loading.

Acceptance: a user can explain assignment versus stored/runtime CWD, shared workspaces, nested projects, unknown/internal records, and incomplete coverage from the view. Reuse the established audit representation when one exists.

<a id="m4"></a>
## M4: Public release readiness

Select a license explicitly. Review complete Git history, repository content, attachments, examples, and distribution artifacts for private data. Confirm synthetic fixtures, supported-build statement, limitations, security reporting, and contribution guidance. A private npm package exists as part of M1. An npm CLI remains the preferred first distribution candidate; publication and distribution are deferred to separately authorized release work.

Inspect package contents with an allowlist and ensure no raw state/reports are shipped. Repository visibility and package publication remain distinct, separately authorized actions. Do not claim a released open-source product before this gate.

## Later milestones

Validated concurrent/live scans; individually reviewed action capabilities; community macOS adapters; supported integrations; standalone Windows/macOS packages; and a desktop application if usage warrants it. Do not assume macOS state layouts or lifecycle parity. The core must not depend on speculative plugin APIs. Monetization infrastructure is not a bootstrap requirement.

## First implementation sequence: M0 only

1. Create entry documentation and navigation.
2. Record operational agent boundaries.
3. Write product principles and conceptual relationships.
4. Preserve all founder observations with synthetic identifying values.
5. Establish evidence and compatibility matrices.
6. Document safety/privacy and experimental workflows.
7. Record founding ADRs, architecture, and research questions.
8. Add contribution/security guidance and hygiene files.
9. Review privacy, scope, consistency, and links without installing tooling.
10. Report completion and stop before M1.

See [open questions](research/open-questions.md) for prerequisites that future authorization must address.
