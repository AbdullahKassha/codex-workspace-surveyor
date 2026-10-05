# Milestone roadmap

## Authorization: design decision

The roadmap describes planned outcomes. It does not authorize implementing all milestones in one run. M0, M1, M2a.1 and M2a.2 are complete. The founder separately authorized M2a.3 Minimal Windows Helper Experiment on 2026-10-05: test-only PowerShell 7/.NET controls, disposable synthetic objects, bounded Node/helper probes and exact-run cleanup. Stop at M2a.3 completion. Every later gate requires separate scoped approval. Private-state research also needs specific authorization identifying what will be read and why.

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

The broader direction is approved in principle. M2a.1/M2a.2 are complete and M2a.3 is separately authorized. Preserve the following gates; do not interpret approval of the direction as authority to execute them together.

| Gate | Scope and exit condition |
| --- | --- |
| M2a.1 — synthetic kernel | Invented SQLite/JSON fixtures, explicit selection, bounded raw acquisition, ownership/containment/stability, existing WAL/SHM, analysis separation, conservative refusal, exact synthetic cleanup, privacy/source-write regression tests; stop with limitations recorded |
| M2a.2 — Windows acquisition controls validation | Supported Node mode/access and two-handle sharing probes on bounded invented files; document established observations, capability gaps and unknowns while retaining native refusal |
| M2a.3 — minimal Windows helper experiment | Test-only managed PowerShell 7 DACL and retained FileShare.Read controls on bounded synthetic fixtures; record descriptors, cross-process sharing and cleanup evidence; leave native refusal unchanged |
| Subsequent synthetic integration/stronger validation | Separate proposal and approval after independent review; helper validation never enables acquisition automatically |
| Disposable Codex validation | Separately approve isolated invented projects/chats and named sources/actions; establish current source locations, schema context and closed-app acquisition evidence |
| M2b — first real adapter | Separately implement minimum metadata reading using validated evidence; unsupported shapes withhold dependent conclusions |
| Personal canary | Separate single-run consent naming source files, full-copy exposure, selected fields, scratch, retention and cleanup; review before further access |
| M2c — conservative audit | Separate real CLI integration with provenance, qualified source coverage and text explanations |
| Git/worktree mapping | Deferred; a later bounded proposal must assess side effects and ownership limits |

M2a.1 uses only existing dependencies and a test-only harness. Native protection refuses; copying tests explicitly simulate the permission prerequisite. It excludes full-disk exhaustion, forced crashes, real concurrent Codex writers, process tracing, aggressive live replacement races, disposable Codex experiments and personal reads. See [ADR 0008](decisions/0008-synthetic-acquisition-kernel.md) and [validation](research/synthetic-acquisition-validation.md).

M2a.2 uses one test-only module and fresh invented control-probe files. Deliberate bounded writes, one rename/unlink and exclusive-creation probes measure ordinary Node handle behavior separately from acquisition source-write regressions. [Validation](research/windows-acquisition-controls-validation.md) records the observed writer/namespace exclusion gap and unverified DACL protection. A demonstrated gap completes this gate; it never enables acquisition or authorizes a helper, alternate-account test, competing subprocess or later Codex experiment.

Private snapshots, sanitized export formats and diffs remain future work requiring another scoped proposal. They are not acceptance prerequisites for the minimal M2 alpha. No real-state reads, real adapter or audit integration follow automatically from M2a.1 success.

M2a.3 uses only the explicitly selected installed PowerShell 7 host and supported .NET APIs, with no compilation, new dependencies, elevation or policy changes. [Helper validation](research/windows-helper-experiment-validation.md) records the current-user-only descriptor policy and controlled competing Node handles. Other-account effective access, hostile races and database/companion atomicity remain unknown. Native acquisition continues to refuse. Independent review precedes an integration proposal; separate approval precedes its execution. Disposable Codex and personal sources remain later gates.

M2 or later may validate real boundary evidence only with separate, specific research and implementation authorization. This optional scope includes bounded marker/policy, qualified Git-root, and instruction-metadata evidence; it does not authorize full private configuration, instruction contents, or arbitrary ancestry scans. No instruction interpreter, Git repair, marker management, or configuration repair is planned.

Acceptance: evidence/context recorded, no source mutations, partial scans qualified, private canaries absent from shareable outputs, and all claims scoped to tested environments. Live scanning remains experimental until separately validated.

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
