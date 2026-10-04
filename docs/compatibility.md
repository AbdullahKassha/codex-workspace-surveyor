# Compatibility and evidence matrix

## Current support: design decision

M0 was documentation-only. M1 implements bundled synthetic CLI explanations, with no real audit capability. No Codex build, source schema, runtime, or operating system is certified for auditing. Windows-native is the first intended real-data target. macOS, WSL, remote hosts, and live-state acquisition remain unvalidated.

M2a.1 adds a test-only synthetic acquisition kernel under [ADR 0008](decisions/0008-synthetic-acquisition-kernel.md). Native acquisition refuses; successful fixture tests explicitly simulate protection. No real source or Codex behavior has been validated by this addition.

Schema compatibility, behavioral applicability, and platform/runtime support are separate. A familiar filename or parseable schema does not establish lifecycle behavior.

## M1 synthetic implementation validation

**Design decision:** record implementation checks separately from Codex behavioral evidence. On 2026-10-04, the synthetic CLI was built and tested on Windows with Node 24.18.1, npm 11.16.0, TypeScript 7.0.2, and Node typings 24.19.1. Exact dependency resolution is in the lockfile. This runtime context does not fill any B0/B1 version or schema gap.

**Initial implementation checkpoint — 2026-10-04:** implementation checks passed: fresh lockfile installation with lifecycle scripts disabled, typecheck, build, all 21 tests, and Windows invocation through `npm run cli -- demo`, listing, and help. The three text goldens were reviewed; relative documentation links/anchors, changed-file privacy, and runtime capability scope were also checked. No private-state reads or lifecycle experiments were performed.

**Final accepted M1 validation — 2026-10-04:** after the review refinements, the final first-commit gate passed with **22/22 tests passed**, typecheck, build, and `git diff --check`. All three bundled scenarios remained available and deterministic; documentation/link checks covered 225 relative links/anchors across 27 documents, and privacy, package/lockfile consistency, and M1 scope checks passed. This is the final accepted synthetic implementation state; the earlier 21-test checkpoint is retained as validation history. No real Codex behavior was reproduced, and M2 remains separately authorized.

The three bundled scenarios cover shared reported CWD strings, separate/ambiguous project identities, unknown/explicit/conflicting membership, stored/UI CWD timing, and simulated directory availability. Semantic counterexamples, fixture checks, reviewed text goldens, and compiled CLI tests validate the M1 design only. They do not reproduce WIN observations, validate actual source coverage, or retire historical rules.

`limited` uncertainty means an explanation is bounded by supplied stipulations; `unresolved` means no relationship resolution is justified. Neither is numeric confidence or severity. Missing directory warnings require explicitly stipulated accessible absence, with conflicting/missing evidence withholding the warning. Matching paths use exact string equality only. There is no real path check or identity normalization.

All B0/B1 applicability and retirement decisions below remain unchanged. Real schema coverage, path aliases/physical identity, classification, current Codex behavior, acquisition safety, and user comprehension remain unknown. Boundary diagnostics remain beyond M1.

**Naming applicability, 2026-10-04 (design decision):** [ADR 0006](decisions/0006-project-naming-and-cli-surface.md) changes the current product name to Workspace Surveyor for Codex. Legacy names remain in historical observations and founding ADRs. This is not a new behavioral experiment, support claim, or rule retirement: B0/B1 applicability, version gaps, and all safety/migration requirements remain unchanged. Local folder, Local Project, and Thread/CWD migration are deferred.

<a id="m2a1-synthetic-kernel-validation"></a>
## M2a.1 synthetic kernel validation

**Design decision / synthetic implementation validation — 2026-10-04:** Node 24.18.1, npm 11.16.0, embedded SQLite 3.53.1, TypeScript 7.0.2 and Node typings 24.19.1 were used on Windows. Embedded SQLite was measured using an in-memory database. Windows build/filesystem type, Codex app/agent versions and real schemas remain unknown; these measurements do not backfill B0/B1.

**Completed M2a.1 validation — 2026-10-04:** typecheck, build and **41/41 tests passed**, including the original 22 M1 tests and 19 synthetic kernel tests. The existing three CLI text goldens remain unchanged. Documentation review checked 249 relative links/anchors across 29 documents and all 20 WIN anchors, with no failures. Changed-file privacy/scope review and whitespace checks passed. Package, lockfile, CLI runtime sources, historical ADR 0001/0007 and both founder investigation records were unchanged. No dependencies were installed and no private-state reads, helpers, disposable Codex experiments, commits or publication occurred. Stop at M2a.1; later gates remain unauthorized.

**M2a.1 review corrections — 2026-10-04:** the four founder-supplied independent-review findings were addressed within the synthetic kernel: sanitized initialization/residual handling, authenticated cleanup retry after deletion-phase failures, an analysis-only WAL-dependence counterexample and canary checks on exceptions/captured diagnostics. Typecheck, build and **46/46 tests passed** (22 original M1 tests and 24 kernel tests), including five new regressions. Documentation/privacy/scope checks and `git diff --check` passed; the initial 41-test checkpoint remains historical. No fixture design, real-state access, dependency/helper, later-M2 capability, staging, commit or push was introduced by these corrections.

The [synthetic validation record](research/synthetic-acquisition-validation.md) details actual invented-file copying under simulated protection, native refusal, exact-run cleanup, companion/stability checks, privacy canaries and source-write regressions. Hashes and operation-boundary checks do not prove absence of transient writes, verified ACL isolation, writer exclusion or atomic cross-source acquisition. No founder experiment is reproduced or retired.

Later validation, helpers, disposable Codex experiments, real adapters and personal canaries remain separately gated. Approval of the broader roadmap grants no source access.

<a id="baseline-context-b0"></a>
## Baseline context B0

Every original WIN-001–WIN-017 row below explicitly references this shared context. The context is part of each row, not an omitted version assertion. WIN-018–WIN-020 belong to separate context B1 and do not inherit B0's database/schema details.

| Field | B0 value |
| --- | --- |
| Evidence category | Founder-observed Windows experiment; not independently reproduced in M0 |
| Observation date | 2026-10-04 |
| Platform/environment | Windows, native Codex Desktop local context as reported |
| Windows build | Unknown |
| Desktop version | Unknown |
| Agent version | Unknown |
| Git version | Unknown |
| SQLite context | Reported filename `state_5.sqlite`; full schema/fingerprint and semantic version unknown |
| Global-state context | Reported `.codex-global-state.json` fields; complete shape/version unknown |
| Acquisition timing | Unknown beyond the founder's qualitative sequence |
| Later validation | None recorded |
| Applicability | Baseline-only; not a supported-version claim |

Keep missing historical versions unknown. A current installation cannot establish which build produced these observations.

## Original investigation comparison matrix: WIN-001–WIN-017

**Category:** results/limits are founder evidence. Proposed implications and retirement criteria are design decisions. Rule IDs name proposals only; no rules engine exists.

The row-specific source context refines B0. All rows retain B0's date, platform, unknown desktop/agent versions, no later validation, and baseline-only status. Future validations must be appended with their own full context.

| Observation / context | Source context | Reported result and limitation | Proposed implication | Future comparison / narrowing or retirement criterion |
| --- | --- | --- | --- | --- |
| [WIN-001](research/windows-2026-10-04.md#win-001), B0 | App identity / filesystem; mapping algorithm unknown | Projects and folders separate; no universal cardinality | Preserve separate identities | Revisit correspondence if a documented identity contract appears; preserve historical distinction |
| [WIN-002](research/windows-2026-10-04.md#win-002), B0 | Assignment / CWD; record shape unknown | Projectless thread can have CWD; assignment-field coverage unknown | Validate membership; R-ORGANIZE-PROJECTLESS is optional advice | Narrow advice if behavior or user intent changes; projectlessness alone is never a defect |
| [WIN-003](research/windows-2026-10-04.md#win-003), B0 | Main-thread/workspace observations | Several main threads share folder; intent unknown | R-SHARED-CWD explains sharing | Retire unnecessary advice if UI makes sharing clear; do not turn sharing into corruption |
| [WIN-004](research/windows-2026-10-04.md#win-004), B0 | Global / SQLite project IDs; schemas unknown | IDs differ across sources; correspondence contract unknown | Namespace IDs; roots may aid correspondence; retain ambiguous matches | Update reconciliation only after a validated cross-source mapping contract |
| [WIN-005](research/windows-2026-10-04.md#win-005), B0 | SQLite `threads.project_id`; global/UI context | Null IDs despite visible membership; frequency unquantified | Null must not imply projectless | Narrow field warning if field semantics become authoritative and validated |
| [WIN-006](research/windows-2026-10-04.md#win-006), B0 | Global `thread-project-assignments` / UI | Better match than SQLite; not eternal authority | Prefer validated assignment evidence without erasing conflicts | Revise preference if future source agreement/freshness changes |
| [WIN-007](research/windows-2026-10-04.md#win-007), B0 | SQLite / index / assignments | Selected visible thread's row/index removed; assignment references seen afterward and absent after Project removal; timing/causality unknown | R-UNRESOLVED-ASSIGNMENT needs complete coverage; shared CWD does not imply dependents | Revalidate cleanup timing and whether references disappear without Project removal before narrowing guidance |
| [WIN-008](research/windows-2026-10-04.md#win-008), B0 | Project UI / files / chats / global assignment | Project removal preserved chats/files; previously seen assignments later absent; cleanup cause not established | Explain separate lifecycles; qualify manual project-removal guide | Update guide after lifecycle/cleanup validation; never infer file deletion or cleanup causality from observation order |
| [WIN-009](research/windows-2026-10-04.md#win-009), B0 | SQLite internal rows / `thread_spawn_edges` | Internal rows survived with missing CWDs/null IDs/no edges; unrelated Guardian records could share workspace; dependency not established | R-INTERNAL-HISTORY is informational; shared CWD is not dependency evidence or a garbage label | Narrow historical interpretation if retention/classification is documented; no deletion authority follows |
| [WIN-010](research/windows-2026-10-04.md#win-010), B0 | Worktrees UI / directory / Git registration | UI removal updated both; ignored-file recovery untested | Prefer owner-supported lifecycle; R-WORKTREE-REVIEW | Update action guidance when lifecycle changes; validate retention before claiming recovery |
| [WIN-011](research/windows-2026-10-04.md#win-011), B0 | Deeplink / CWD-copy UI | Useful navigation and copy actions; no universal stability | Optional private navigation and manual CWD evidence | Retire/update link format if unsupported; copied CWD remains distinct from runtime |
| [WIN-012](research/windows-2026-10-04.md#win-012), B0 | SQLite CWD extended prefix | Extended Windows prefix present; namespace cases untested | Semantic path comparison required | Extend tested path policy as evidence grows; do not globally strip prefixes |
| [WIN-013](research/windows-2026-10-04.md#win-013), B0 | Project roots / filesystem nesting | Parent and child independently projects; membership precedence unknown | R-NESTED-PROJECTS explains overlap | Narrow UI advice if overlap becomes obvious; nesting alone is never broken |
| [WIN-014](research/windows-2026-10-04.md#win-014), B0 | Project-removal lifecycle / thread | Thread survives project removal as projectless; references incompletely inventoried | Preserve independent thread identity | Update retention guidance after validated lifecycle changes |
| [WIN-015](research/windows-2026-10-04.md#win-015), B0 | Filesystem / SQLite CWD / copied CWD / next turn | Earlier running-app rename failed; closed-app rename succeeded, holder unknown; old CWD retained and next turn created fallback; one probe | R-MISSING-CWD explains recorded fallback risk; no universal folder-lock claim | Retire fallback prediction for builds proven to handle renames safely; retain actual missing-path diagnosis |
| [WIN-016](research/windows-2026-10-04.md#win-016), B0 | Assignment / runtime / SQLite / copy UI / project removal | Only copied CWD checked immediately, still previous; runtime destination during turn; copied/SQLite destination afterward; exact trigger unknown; menu route build-specific | R-MIGRATION-VERIFY separates assignment from post-turn persistence observations | Prefer a validated supported migration mechanism if available; retire bridge on incompatibility |
| [WIN-017](research/windows-2026-10-04.md#win-017), B0 | Second migration / runtime / stored/copied CWD / root | Destination agreement and absent old path; no supplied bridge-removal result | Corroborates experimental bridge, not universal safety | Add independent revalidation; never use two successes to guarantee future outcomes |

<a id="boundary-context-b1"></a>
## Separate boundary-research context B1

**Category:** founder-observed Windows evidence from the [article-derived boundary record](research/project-boundary-observations.md), not independently reproduced by Workspace Surveyor. The original 2026-10-04 baseline remains 17 observations; these three records form a separate research group.

| Field | B1 value |
| --- | --- |
| Source / review date | Founder article published 2026-08-22; reviewed 2026-10-04 |
| Observation dates | WIN-018: 2026-08-20–21; WIN-019: historical audit dates unknown; WIN-020: 2026-08-20 |
| Platform/environment | Windows local Codex Desktop; PowerShell reported for controlled experiment |
| Desktop / agent / Windows / Git versions | All unknown; model selection is not an app-version identifier |
| Effective marker policy / trust | Not independently established for historical runs |
| State/schema context | No database/schema context established or needed for these records; B0 context not imported |
| Later validation | None recorded |
| Applicability | Baseline-only, limited to reported experiments; not a supported-build claim |

### Boundary comparison matrix: WIN-018–WIN-020

Results/methods/limits are founder evidence; implications and comparison/retirement criteria are design decisions. Each row retains B1's unknown versions and baseline-only applicability. Rule-family names are documentation proposals only.

| Observation / context | Measurement method and observed outcome | Applicability / limitations | Proposed implication | Revalidation / narrowing or retirement |
| --- | --- | --- | --- | --- |
| [WIN-018](research/project-boundary-observations.md#win-018), B1 | Fresh threads per A/B/C/D phase; controlled empty-marker states and responses: parent-defined response in A/C, different responses in B/D | One Windows experiment; boundary inferred from responses, not direct loader/root trace; effective configuration, trust, timing, and versions uncertain | R-BOUNDARY-* may explain marker-supported boundaries and parent eligibility; keep discovered root separate from CWD fallback | Authorized comparisons record policy/trust, build, CWD, marker states, response and direct discovery evidence if available; narrow/replace interpretation for validated contradicted or superseded builds; preserve history |
| [WIN-019](research/project-boundary-observations.md#win-019), B1 | Filesystem entry/content/timestamp audit versus Git query recognition; own marker present without established Git root | Historical audit, exact dates/query contexts unknown; shared timestamps do not prove origin; no loader observation | Marker occurrence is distinct from Git recognition, metadata identity, and creation cause; no removal-safety finding | Qualify Git queries, aliases, permissions, and policy before comparison; revise origin hypotheses only with direct evidence; retire obsolete creation guidance only for validated ranges |
| [WIN-020](research/project-boundary-observations.md#win-020), B1 | Clean local project ordinary file creation/read followed by entry checks; earlier entry creation did not recur | One Windows workflow; unknown build; no existing-marker interpretation test and no universal fix established | Creation counterexample narrows universality; it does not retire boundary interpretation explanations | Test creation and existing-marker interpretation separately; retire/narrow creation warning only for evidenced workflow/build range; replace interpretation rules only with independent interpretation evidence |

Preventing marker creation does not establish how existing markers are interpreted. A creation fix cannot automatically supersede WIN-018's interpretation evidence. Append reproduced, contradicted, superseded, or unknown results with their own applicability range; do not backfill historical versions or rewrite either investigation set.

## Official-source comparison records

These records do not reproduce WIN observations. Each has an access date of 2026-10-04 and remains documentation-only evidence; no local validation or historical-build applicability is claimed.

| Source | Surface / context | Design impact | Revalidation criterion |
| --- | --- | --- | --- |
| [DOC-001](research/evidence-catalog.md#doc-001-app-server-listing-side-effects) | App Server listing | Review side effects before integration | Recheck startup/listing behavior before any API-backed scanner |
| [DOC-002](research/evidence-catalog.md#doc-002-worktree-roots-and-lifecycle) | Managed worktrees | Custom-root coverage and qualified lifecycle guidance | Recheck root discovery and recovery semantics on target build |
| [DOC-003](research/evidence-catalog.md#doc-003-state-location-configuration) | Listed CLI/IDE/server consumers | Explicit locations and surface-specific discovery | Establish Desktop effective settings rather than assuming shell parity |
| [DOC-004](research/evidence-catalog.md#doc-004-native-windows-and-wsl-state) | Native Windows / WSL | Separate host/environment boundaries | Validate WSL independently before support claims |
| [DOC-005](research/evidence-catalog.md#doc-005-configurable-project-root-markers) | Project-root configuration/discovery; local Desktop settings unknown | Policy-dependent marker evidence; creation distinct from interpretation | Recheck documented policy and authorized target-build effective configuration; no historical-build backfill |
| [DOC-006](research/evidence-catalog.md#doc-006-project-instruction-discovery) | Instruction discovery/selection; Desktop timing unvalidated | Distinct instruction statuses and ancestry exclusion reasons | Recheck target context, trust, timing, selection, and direct loading evidence without claiming actual compliance |

## Proposed-rule safeguards: design decisions

- R-MISSING-CWD requires accessible local-path absence; inaccessible/offline/uninspected are not missing. The warning's generalization remains tentative outside B0.
- R-UNRESOLVED-ASSIGNMENT requires validated source coverage; unresolved cleanup timing or partial acquisition can explain disagreement. Thread-deletion/Project-removal observation order does not establish cleanup causality; see [Q-15](research/open-questions.md#q-15).
- R-ORGANIZE-PROJECTLESS and R-SHARED-CWD are optional organization opportunities. Membership unknown is not projectless; stable CWD needs repeated observations.
- R-NESTED-PROJECTS is explanatory, not a defect classification.
- R-INTERNAL-HISTORY does not assign internal status from titles, null fields, missing CWDs, or absent spawn edges.
- R-WORKTREE-REVIEW cannot establish ownership or abandonment from root containment or missing observed chats.
- R-MIGRATION-VERIFY requires runtime and persistence evidence; assignment alone does not satisfy it. WIN-016 established post-turn persistence observations, not the exact persistence mechanism or trigger.

Other future proposals include dated naming, project with no observed chats, and assignment-root/stored-CWD disagreement. They must record counterexamples and coverage requirements before implementation. No overall health score is planned initially.

<a id="r-boundary"></a>
### R-BOUNDARY-* direction: documentation-only design proposals

These future explanatory families are deferred beyond M1, not implemented rules or authorization to inspect a filesystem/configuration. Root disagreement alone is informational, not a cleanup finding.

| Potential explanation | Evidence prerequisite / limit |
| --- | --- |
| Codex boundary differs from Git-recognized root | Qualified discovery-context and Git observations; roots are not identities or ownership claims |
| A nearer configured marker supports another boundary | Known effective policy and bounded occurrence evidence; inferred support is not direct root-selection proof |
| Expected parent instruction lies above the effective boundary | Qualified boundary, CWD, and file-location evidence; distinct from a sibling outside ancestry; no loading/compliance inference |
| Marker exists without Git evidence establishing a repository there | Qualified query context/result; errors may mean access/configuration/environment failure, not invalid repository |
| Custom or disabled marker policy changes interpretation | Effective-policy evidence; unknown configuration must remain unknown rather than becoming a default claim |
| Evidence is insufficient to determine boundary | Explicit missing/conflicting coverage, policy, timing, alias, or trust evidence; withhold definite conclusions |

No family recommends marker changes, settings repair, instruction moves, Git repair, cleanup, or removal/abandonment classification. See [feature safety](safety-and-privacy.md#project-boundary-diagnostics-safety-design-decisions).

## Future validation and retirement: design decisions

For each new observation, append date, platform/environment, app/agent versions, schema fingerprint when applicable, measurement method, sanitized steps/result, limitations, evidence source, related rule IDs, and relation to the affected B0 or B1 records. Use applicability states baseline-only, reproduced, contradicted, superseded, or unknown. Attach later results to every affected matrix row instead of replacing the original result. Boundary revalidation must separately identify marker creation and marker interpretation, effective-policy knowledge, and whether root/instruction claims were observed or inferred.

Use the [documentation-only revalidation template](research/compatibility-revalidation-template.md) to record a future comparison. The template does not authorize research and contains no runtime schema.

Before changing a rule, distinguish schema drift from behavioral change. Additive fields may be ignorable after review; missing required fields, incompatible types, or unknown source values disable dependent interpretations. A known schema on an untested release is not behavioral certification.

Retirement means stopping an obsolete rule/guidance for a documented applicability range, recording the reason and replacement, and retaining its history. A Codex fix may retire the fallback warning while path accessibility checks remain useful. Safety/privacy design decisions are not automatically retired by a product fix. Workspace Surveyor must not directly mutate Codex-owned SQLite databases or Codex-owned JSON state. Any reversal requires an explicit superseding decision/ADR.

See [evidence catalog](research/evidence-catalog.md) and [research gates](research/open-questions.md).
