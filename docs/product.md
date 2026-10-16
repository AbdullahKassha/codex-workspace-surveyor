# Product definition

## Current product summary, 2026-10-16

The founder-supplied accepted baseline `2a12ecf9fa757b6f1a32adec60892620f06acee3` delivers a Windows relationship Explorer with reusable sessions, explicit closed-app Refresh, conditional instruction metadata and snapshot reuse on relaunch. It remains a source-checkout preview; live acquisition, exports and automated organization/migration are unavailable. See [Getting started](getting-started.md) and the [current roadmap](roadmap.md#current-position-and-priorities-2026-10-16).

The capability names and dated product/refinement descriptions below retain their original scope. Earlier pending browser-acceptance wording describes those checkpoints and is superseded by the supplied accepted baseline; it is not a new measurement or separate acceptance claim. The retained initial MVP vision does not override the current deferral of dedicated Health/Organization or Before/After systems.

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

These are descriptive capability names, not public APIs or authorization. The accepted relationship explorer implements bounded folder/Git/worktree observation. The delivered Instruction Discovery Scope slice adds conditional marker/standard instruction-file metadata explanations; effective configuration, loading and action capabilities remain deferred.

**Historical priority reconciliation, 2026-10-15:** the [roadmap](roadmap.md#current-position-and-priorities-2026-10-15) records the delivered baseline and current ordering separately from these capability names and the retained early product vision below. Migration Guidance is [organic documentation only](index.md#qualified-manual-workflows); dedicated Health/Organization and Before/After systems are deferred, not implicit MVP or public-release prerequisites.

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

## Current delivered experience and deferred outcomes

**Accepted scope, reported 2026-10-10:** the local browser presents light vertical, numbered Workspace groups, assigned Threads, group-level Source folders, projectless Threads, deduplicated working locations, standalone folder context and verified Git/worktree relationships. Details and Diagnostics preserve useful uncertainty; native browser Find works with Thread expansion. Folder inventory, raw prompt titles and cleanup actions are absent. [Validation](research/explorer-local-read-only-validation.md#accepted-milestone-2026-10-10) and [compatibility](compatibility.md) qualify this bounded Windows experience. Evidence & Compatibility was the next priority at that time.

**Founder-approved presentation refinement, 2026-10-14:** the relationship tree remains the primary navigation surface. Details identifies the selected entity, shows useful full paths and exceptional status, and omits ordinary association lists and repeated navigation. Thread Details uses “Working folder,” short observed-file findings and a possible boundary explicitly based on the documented default `.git` assumption; effective Desktop settings remain unverified. Incomplete checks retain scoped explanations. Initially collapsed “Technical information” provides IDs, original paths and optional access to entity-specific Diagnostics, where relationship reasoning, negative checks, instruction limitations and provenance remain available. Only validated, short extended drive paths receive a conventional display/copy spelling; evidence and operational paths remain exact. Device, UNC, long and ambiguous spellings are preserved. This supersedes the dated normal-Details wording below without changing observations, interpretation or Workspace structure.

**Progressive evidence refinement, also approved 2026-10-14:** Technical information retains IDs and exceptional original spellings without repeating unchanged paths; identical administrative/shared Git paths appear once. Small, initially collapsed information disclosures explain nonobvious states in plain language, including usual versus retained source locations and reviewed documentation sources. Selected Diagnostics groups record identity, relationships and instruction search into accessible disclosures. Relationship groups resolve entity types/names/paths, show counts, and reveal 25 entries at a time with exact references on demand. Instruction findings explain why Codex may stop at an observed `.git` under the documented default assumption; actual Desktop settings remain unchecked. Negative checks, obstructions and exact metadata remain expandable. This is presentation only, with no Workspace, observation, membership, session or access-policy change.

**Final presentation refinement, 2026-10-15 (browser acceptance pending):** unchanged Workspace groups retain their order and internal numbering, with entity-led presentation instead of generic numbered headings. Ordinary Source folders omit a repeated link to the sole Project already shown; shared and cross-Project references remain. Diagnostics groups identical readable relationship labels while explicitly distinguishing raw observation counts from distinct referenced entities. Each original reference remains available through collapsed, paginated evidence. Technical information and help begin collapsed and retain native summary controls. This changes presentation only; instruction findings remain conditional observations, not evidence of Desktop loading.

**Summary-first correction following browser feedback, 2026-10-15:** Inspect evidence is directly available in Details, outside optional IDs and original spellings. Selected Diagnostics immediately shows identity, useful paths, readable relationship summaries and conditional instruction findings. Exact relationships, metadata checks and record qualifications sit in shallow evidence disclosures. Related-entity counts exclude the selected entity; repeated observations remain separately counted. Expand all / Collapse all controls evidence sections and contextual help, retaining the first 25 entries in large lists. Show all remaining deliberately reveals an entire remaining collection without repeated paging. Ordinary summaries never open those raw collections automatically. Workspace structure, evidence and source access are unchanged; renewed browser acceptance remains pending.

## Retained initial CLI scope: design decisions

M1 now demonstrates bundled synthetic observations → retained relationships → conservative interpretation → text explanation. It implements only the `overview`, `disagreement`, and `coverage` scenarios through `npm run cli -- demo`; see [README](../README.md#run-the-synthetic-demonstration). This is a working product skeleton, not a real inventory, public API, boundary diagnostic, or validation of metadata sufficiency. All broader capabilities below remain prospective.

The later MVP should inventory projects, thread metadata, assignments, and referenced directories; explain conflicts; identify missing CWD risks; offer conservative organization advice; produce snapshots/reports; and compare before/after evidence. Optional Git inspection adds bounded worktree relationships at known roots.

Organization opportunities include shared CWDs, projectless threads at an existing project root, dated workspace naming, nested projects, and projects with no observed chats. A naming suggestion is optional advice, not a defect. A stable CWD requires repeated comparable observations. Lack of observed chats must be qualified by coverage.

Exclude automatic fixes, file moves, database editing, deletion, transcript analysis, whole-disk discovery, background monitoring, remote/cloud auditing, WSL reconciliation, macOS certification, and speculative plugin dependencies. Limited metadata cannot establish that a physical workspace is abandoned or safe to remove.

## Instruction Discovery Scope: conditional metadata first, 2026-10-12

**Founder-approved first slice, following baseline `05186ce6590de8b5c38f5bf7666eacbd63c2e54f`:** snapshot enrichment now observes exact `.git`, `AGENTS.override.md` and `AGENTS.md` metadata along qualifying stored-CWD ancestry within the selected discovery root. Thread Details presents a conditional documented-policy boundary, observed instruction-file paths (at most four), and coverage uncertainty. Additional selected-CWD evidence belongs to existing Diagnostics; Workspace groups/tree and membership semantics are unchanged. Details selection performs no reads.

Effective configuration remains unknown. Ordinary marker presence is independent of Git metadata validity. A candidate needs complete nearer negative marker checks; scope limits or obstructions cannot justify CWD-only fallback. Instruction-file presence, size and documented override order do not establish selection, loading, following or historical behavior. Global guidance, custom markers/fallback names, instruction contents and configuration qualification remain deferred. No separate marker-only milestone or inventory UI is introduced. Existing WIN-018–020, DOC-005/DOC-006 and DOC-025 retain their original applicability limits. See [validation](research/explorer-local-read-only-validation.md#instruction-scope-2026-10-12).

The dated relationship-explanation slice below remains its original scope; this supplement adds the separately approved observations.

## Project Boundary Diagnostics: relationship explanations, 2026-10-12

**Approved implementation scope:** the first slice explains existing snapshot relationships in entity Details: stored Project assignment, explicit projectlessness versus unknown membership, declared Source folders, stored CWD matches/differences, shared folders, lexical Git-tree location and verified common Git identity. The compact Workspace groups and relationship tree retain their existing semantics. Empty Project wording is qualified by the observed assigned-Thread population; Git links distinguish verified repositories/worktrees from unverified metadata.

This slice adds no observations or boundary selection. Git Details explicitly leaves the effective Codex discovery boundary unestablished. Marker presence/type/absence, effective marker policy and candidate-boundary analysis require a separately specified observation slice. All AGENTS.md eligibility, selection, loading and following questions remain in Instruction Discovery Scope. Reuse [WIN-018–WIN-020](research/project-boundary-observations.md), [DOC-005/DOC-006](research/evidence-catalog.md#doc-005-configurable-project-root-markers) and [DOC-025](research/evidence-catalog.md#doc-025-standard-git-administrative-relationships) with their original limits; this implementation creates no new Codex behavioral evidence.

The broader future design below retains its original research questions; it does not expand this approved slice. See [implementation validation](research/explorer-local-read-only-validation.md#project-boundary-explanations-2026-10-12).

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

[M3](roadmap.md#m3) should make project, chat, directory, worktree, and repository relationships obvious, with selectable evidence, conflicts, and coverage. The accepted slice uses a compact relationship tree, selection details and native browser Find. Before/after inspection and boundary-specific visualization remain future outcomes.

M3 may also visualize boundary relationships that later authorized research has validated. Boundary-specific UI remains outside M1.

## Assumptions and unknowns

Assumption A-01: a CLI is a practical first interface for the initial audience. If usability feedback contradicts it, bring the visual prototype forward without relaxing evidence or privacy requirements.

Assumption A-02: useful relationship explanations can be produced without conversation content. If insufficient metadata is found, narrow claims before expanding data access.

Unknown: the minimum validated record fields, UI-membership coverage, and reliable organization thresholds. See [open questions](research/open-questions.md).

## Recovery follow-up (2026-10-14 preparation)

After a settled cleanup failure, **Recover temporary copies** offers one explicit recovery action within the existing session. It can clean authenticated copies or preserve one eligible unresolved inventory conflict. It never disposes of unverified objects. Successful recovery offers Refresh; preservation retains its visible obligation and asks for normal close/relaunch. Blocked recovery directs the user to the bounded incident procedure. Startup and ordinary page reads do not trigger recovery. The private, separately approved incident-closure workflow remains distinct from this everyday action; see the [complete scope and run sheet](research/personal-canary-preparation-validation.md#one-final-founder-host-closure-workflow--not-yet-authorized).
