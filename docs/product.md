# Product definition

## Identity and capability names: design decision

**Workspace Surveyor for Codex** is the product name; **Workspace Surveyor** is the contextual short name. "For Codex" describes compatibility. The independent-community disclaimer and technical surface names are recorded in [ADR 0006](decisions/0006-project-naming-and-cli-surface.md).

| Capability | Display name |
| --- | --- |
| Relationship mapping | Workspace Topology |
| Boundary explanation | Project Boundary Diagnostics |
| Instruction discovery explanation | Instruction Discovery Scope |
| Evidence tracking | Evidence & Compatibility |
| Organization advice | Organization Guidance |
| Migration advice | Migration Guidance |
| Before/after inspection | Before/After Audits |
| Visual browsing | Workspace Explorer |

These are descriptive names, not runtime modules, schemas, APIs, subcommands, or implementation authorization. Boundary diagnostics remains beyond M1; real Git/worktree and instruction discovery remain subject to later research and implementation gates.

## Problem: founder-observed evidence

Local Codex organization is difficult because project identity, chat identity, directory location, and historical metadata can change independently. [WIN-001 through WIN-017](research/windows-2026-10-04.md) document Windows examples: projectless chats with real CWDs, shared directories, different project ID namespaces, lingering internal records, and external renames that left stored CWDs unchanged.

The most consequential sequence was a missing projectless CWD followed by a new turn: Codex created a replacement workspace instead of discovering the renamed folder ([WIN-015](research/windows-2026-10-04.md#win-015)). A temporary Local Project later acted as a migration bridge: immediately after assignment, only Copy working directory was checked and it showed the previous path; runtime CWD was the destination during the successful turn, and copied/SQLite CWDs showed it afterward ([WIN-016](research/windows-2026-10-04.md#win-016)). Persistence was observed after that turn; its exact mechanism and trigger are unknown. These are experimental results with unknown historical app versions.

## Intended outcomes: design decisions

The audience begins with Windows-native Codex Desktop users comfortable running a CLI and developers investigating compatibility. The product answers what Codex reports, what the accessible filesystem contains, how those observations relate, and what the user can safely consider next.

The workflow is inspect, understand, explain, detect risk, suggest organization, guide supported actions, and re-audit. Measure success by comprehensible explanations and trustworthy uncertainty, not the count of deletions or warnings.

Principles:

- Separate app identities, filesystem identities, and execution context.
- Preserve contradictory evidence rather than forcing a single authoritative relationship.
- Explain both recommendations and reasons to withhold them.
- Treat unusual organization as potentially intentional.
- Show source coverage and limitations wherever conclusions depend on them.
- Keep diagnosis local, deterministic, and usable without an LLM or account integration.
- Make visual understanding an early deliverable.

## Initial CLI scope: design decisions

The later MVP should inventory projects, thread metadata, assignments, and referenced directories; explain conflicts; identify missing CWD risks; offer conservative organization advice; produce snapshots/reports; and compare before/after evidence. Optional Git inspection adds bounded worktree relationships at known roots.

Organization opportunities include shared CWDs, projectless threads at an existing project root, dated workspace naming, nested projects, and projects with no observed chats. A naming suggestion is optional advice, not a defect. A stable CWD requires repeated comparable observations. Lack of observed chats must be qualified by coverage.

Exclude automatic fixes, file moves, database editing, deletion, transcript analysis, whole-disk discovery, background monitoring, remote/cloud auditing, WSL reconciliation, macOS certification, and speculative plugin dependencies. Limited metadata cannot establish that a physical workspace is abandoned or safe to remove.

## Project Boundary Diagnostics: future design scope

This first-class capability is deferred beyond M1 and requires separate later research and implementation authorization. It must not block the initial synthetic CLI foundation. [WIN-018–WIN-020](research/project-boundary-observations.md) form a separate founder-observed Windows research group, with historically uncertain versions and no independent Workspace Surveyor reproduction. Independently reviewed official sources are [DOC-005 and DOC-006](research/evidence-catalog.md#doc-005-configurable-project-root-markers).

The capability should answer:

- Why does Codex behave as if this child directory is a separate project?
- Why does Git report one root while Codex appears to use another boundary?
- Why is a parent AGENTS.md apparently outside the effective discovery scope?
- Does a nearby marker support a different Codex project boundary?
- Is current evidence insufficient to determine the boundary?

Keep Local Project root, thread CWD observations, Codex filesystem discovery boundary, marker policy and occurrences, Git repository/worktree roots, and instruction scope separate; see the [relationship model](relationship-model.md#project-boundary-distinctions-design-decisions). Explain disagreement with evidence and uncertainty. Root disagreement alone is informational, not a cleanup finding or proof of an incorrect boundary. Unknown effective configuration must not silently become a default-setting claim; a Git query error must not automatically become an invalid-repository claim.

This is not Git repair, marker cleanup or management, AGENTS rewriting, configuration repair/debugging, instruction interpretation/emulation, proof of file ownership, general filesystem cleanup, or automated organization changes. Do not recommend marker creation/deletion, root-setting changes, moving instructions, artifact removal, or abandonment classifications. A discovery boundary is not a sandbox or access-control boundary.

## Visual outcome: design decision

[M3](roadmap.md#m3) should make project, chat, directory, worktree, and repository relationships obvious, with selectable evidence, conflicts, and coverage. A focused relationship view with searchable tables/tree navigation is preferable to a graph of every record. A separately approved synthetic prototype can begin earlier.

M3 may also visualize boundary relationships that later authorized research has validated. Boundary-specific UI remains outside M1.

## Assumptions and unknowns

Assumption A-01: a CLI is a practical first interface for the initial audience. If usability feedback contradicts it, bring the visual prototype forward without relaxing evidence or privacy requirements.

Assumption A-02: useful relationship explanations can be produced without conversation content. If insufficient metadata is found, narrow claims before expanding data access.

Unknown: the minimum validated record fields, UI-membership coverage, and reliable organization thresholds. See [open questions](research/open-questions.md).
