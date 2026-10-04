# Milestone roadmap

## Authorization: design decision

The roadmap describes planned outcomes. It does not authorize implementing all milestones in one run. M0 documentation/hygiene implementation is authorized; completion must stop before M1. Every later milestone requires separate scoped approval. Private-state research also needs specific authorization identifying what will be read and why.

Commits, publication, visibility changes, and cleanup require separate authorization. Approval of product direction is not approval for those actions.

<a id="m0"></a>
## M0: Foundation

Deliver README, AGENTS.md, product/architecture/relationship documentation, the original 17 sanitized observation records and separate WIN-018–WIN-020 boundary-research group, evidence catalog, compatibility matrix, safety/privacy requirements, five founding ADRs, qualified workflows, roadmap, contribution/security guidance, and hygiene files.

Use only supplied observations, official documentation, and synthetic examples. No private Codex reads, package initialization, dependency installation, implementation code, runtime schemas/APIs, empty source scaffolding, or release automation.

Completion checks: document-only scope; privacy review; relative links/anchors; original WIN-001 through WIN-017 traceability and separate WIN-018–WIN-020 traceability; distinct claim categories; explicit historical version gaps; future validation and retirement fields; README accurate about missing executable capabilities.

Report created files, checks, and unresolved research questions. Stop.

<a id="m1"></a>
## M1: Synthetic CLI foundation

Separately authorize a small vertical slice using generated synthetic inputs. Define the minimum runtime/module/test choices needed for useful relationship explanations. Establish evidence-bearing relationships and basic conservative output. Do not add public APIs, registries, or frameworks without a concrete need.

M1 is synthetic-only. It categorically excludes discovery of real local Codex state, real Codex adapters, App Server startup for inspection, reads of personal Codex state, and any private-state acquisition. Approval of M1 does not authorize these activities. Any proposed departure requires separate explicit authorization specifying the activity and revising the scope before work begins.

Project Boundary Diagnostics does not expand M1's implementation scope. M1 also excludes real boundary discovery algorithms, real filesystem ancestry scans, configuration adapters, Git discovery/classification, AGENTS content inspection, instruction-loader emulation, verification turns, and boundary-specific UI. Boundary diagnostics is deferred beyond M1 and must not block the initial CLI foundation.

Acceptance: a synthetic example explains shared CWDs, differing ID namespaces, unknown membership, and missing-path uncertainty. Counterexamples prevent false corruption labels. No excluded discovery, adapter, startup, personal-state read, or private acquisition is performed.

<a id="m2"></a>
## M2: Private Windows read-only alpha

Separately authorize bounded source research and implementation. Validate schema shapes, source discovery, classification, quiescent acquisition, scratch permissions/WAL handling, and no-source-write behavior before enabling real adapters. Add conservative findings, private snapshots, sanitized reports, diffs, and optional bounded Git/worktree mapping.

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

Select a license explicitly. Review complete Git history, repository content, attachments, examples, and distribution artifacts for private data. Confirm synthetic fixtures, supported-build statement, limitations, security reporting, and contribution guidance. An npm CLI is the preferred first distribution candidate, not an initialized package today.

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
