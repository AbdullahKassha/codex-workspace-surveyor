# Compatibility and evidence matrix

## Current support: design decision

**Current local-display preparation supplement, 2026-10-07:** [PMAP-001](research/personal-thread-cwd-observation.md) reports a successful bounded private map of 139 claims / 15 exact CWD groups, with selected-table interpretation complete and cleanup reported removed. Additional columns were unconsumed, not proven drift; versions remain provenance and schema/acquisition capabilities determine compatibility. [ADR 0013](decisions/0013-local-thread-cwd-display-preparation.md) prepares a private escaped terminal view on invented inputs only, gated by verified cleanup and future explicit local-display consent. The completed authorization is consumed and no retained personal map exists. Earlier status/measurement statements below retain their historical timing.

**Current MAP preparation supplement, 2026-10-07:** [ADR 0012](decisions/0012-personal-thread-cwd-map-preparation.md) prepares a fixed private personal invocation of the unchanged two-field adapter, tested only on invented protected copies. [Validation and the proposed run sheet](research/personal-thread-cwd-preparation-validation.md) distinguish preflight refusal from a consumed acquisition and withhold summaries on safety failure. Schema/capability checks determine compatibility; Desktop version alone triggers no investigation. Actual record values remain private memory, with no personal run or display permission granted by preparation. Earlier measurements below remain historical.

**Current supplement, 2026-10-07:** [PSQ-001](research/personal-qualification-observation.md) reports accepted candidate structure and one non-null TEXT ID/CWD sample, with successful reported cleanup. No actual values, complete schema inventory, uniqueness or broad compatibility was established. [ADR 0011](decisions/0011-thread-cwd-adapter-preparation.md) permits synthetic-only preparation of bounded actual-value reading and source-local claims; [validation](research/thread-cwd-adapter-validation.md) remains separate implementation evidence. Extra ordinary columns within bounds are tolerated and ignored, not labeled new drift. Versions are provenance; required schema and acquisition controls determine compatibility. Personal invocation and M2c remain separately gated.

**Current supplement, 2026-10-06:** [PCAN-001](research/personal-canary-observation.md) is founder-reported evidence of one successful personal database/WAL/SHM acquisition, schema-only readability and cleanup. It does not establish a supported source schema or metadata semantics. Separate synthetic runtime requalification passed 179/0 explicit and 79/100 ordinary (passes/skips), with no failures, using PowerShell 7.6.6/.NET 10.0.12 and Node 24.18.1. Earlier measurements below remain historical. No product audit support, reusable adapter or renewed personal authorization follows; copied-schema qualification is synthetic preparation only pending independent review and fresh consent.

The [qualification preparation record](research/personal-qualification-preparation-validation.md) separately tests the fixed `main.threads` hypothesis under [ADR 0010](decisions/0010-copied-schema-qualification.md). It preserves the original canary and uses only invented data. Projected schema fields exclude defaults; one sample returns type/nullness flags rather than record strings. The full synthetic suite passed **203** with no skips; the ordinary run passed **98** with **105** skips, no failures, with typecheck/build passing. These tests establish no current personal schema compatibility or metadata meaning. Independent review remains pending.

M0 was documentation-only. M1 implements bundled synthetic CLI explanations, with no real audit capability. No Codex build, source schema, runtime, or operating system is certified for auditing. Windows-native is the first intended real-data target. macOS, WSL, remote hosts, and live-state acquisition remain unvalidated.

M2a.1 adds a test-only synthetic acquisition kernel under [ADR 0008](decisions/0008-synthetic-acquisition-kernel.md). Native acquisition refuses; successful fixture tests explicitly simulate protection. No real source or Codex behavior has been validated by this addition.

M2a.2 adds supported-Node Windows control probes on disposable invented files. Ordinary read-opens admitted writes, rename and unlink; scratch DACL protection remains unverified. These measurements do not enable acquisition or certify any Codex source. See [the controls record](research/windows-acquisition-controls-validation.md).

Schema compatibility, behavioral applicability, and platform/runtime support are separate. A familiar filename or parseable schema does not establish lifecycle behavior.

M2a.3 separately tested supported managed Windows DACL and retained read-sharing controls using a PowerShell 7 helper and competing Node handles on disposable synthetic objects, without integration in that gate. Actual descriptor configuration and bounded sharing behavior are established only for that execution context; other-account effective access remains unknown. See [helper validation](research/windows-helper-experiment-validation.md). M2a.4 adds only the separately authorized synthetic helper/kernel path described below; native acquisition still refuses.

<a id="personal-canary-preparation"></a>
## Personal closed-app canary preparation

**Design decision / synthetic implementation validation — 2026-10-06:** [ADR 0009](decisions/0009-personal-closed-app-canary.md) permits a separately authorized personal canary without a VM prerequisite. Preparation alone is approved. A separate private runner/helper accepts external selection only after later consent; tests use invented fixtures and injected closure observations. No actual process observation, personal acquisition or Codex schema validation occurred. Historical isolation/M2a records and native refusal remain unchanged.

The [preparation record](research/personal-canary-preparation-validation.md) records runtime context, bounded copying, schema-only authorizer checks, exact fault-stage evidence, cleanup/residual handling and future external-run procedure. Initial checks passed 143 explicit tests with zero skips and 77 ordinary tests with 66 skips. The separately approved P1/P2 correction adds protected persistent authentication and exact scratch identities before source reads, exclusive restart recovery and validation before helper spawn. That checkpoint passed **171** explicit tests with zero skips, and **78** ordinary tests with **93** skips; subsequent review found that receive deadline expiry could release exclusion during Node deletion. The separately approved remaining P1 correction moves synchronous scratch deletion into the exclusive-handle helper, retaining Node's per-step identity authorization. EOF, cancellation, malformed commands and deadline expiry stop further dispatch without releasing the handle during an in-flight step. Resolved P2 and the existing timeouts remain unchanged. Controlled graceful-exit recovery does not establish power-loss or arbitrary-crash durability. Protected copies and retained sharing observed on synthetic inputs do not establish writer-list completeness, current source suitability, hostile-race safety, atomic companions or real-state readiness. Earlier and correction-development residuals are explicitly disclosed rather than represented as clean success. Independent re-review and exact personal consent remain prerequisites; a schema-only success would precede a further bounded qualification proposal, not M2b automatically.

**Final lifetime-correction validation:** typecheck/build passed; explicit synthetic validation passed **179**, zero skips/failures, and ordinary validation passed **79**, with **100** skips and zero failures. The controlled destructive interval crossed 35 seconds, a contender remained busy after the old 30-second deadline while Node timed out, and later exact recovery succeeded after release. EOF/malformed/late-authorization cases stopped further deletion and preserved unrelated sentinels. Link/privacy/scope/whitespace checks passed; independent re-review remains pending.

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

<a id="m2a2-windows-acquisition-controls-validation"></a>
## M2a.2 Windows acquisition controls validation

**Design decision / implementation validation on synthetic inputs — 2026-10-05:** the founder separately authorized supported Node filesystem probes and exact-run cleanup. The baseline was `2e51e45`; probe changes were uncommitted. Node 24.18.1, bundled libuv 1.52.1, `win32`/`x64` and Windows release `10.0.26300` were measured through built-in runtime APIs. The official matching source was reviewed before execution. Filesystem type, actual ACLs and all Codex versions/state remain unknown. This contemporaneous release observation does not backfill B0, B1 or M2a.1.

**Observed controls:** requesting directory/file modes and applying `chmod(0600)`/`chmod(0644)` left reported permission bits `0666`; current-process R_OK/W_OK checks succeeded. No descriptor or alternate-account access was inspected. Ordinary Node read-opens admitted a verified synthetic write in both handle orders, one rename and one unlink. A retained `'wx'` handle refused another exclusive creation but admitted a writing handle. These are narrow counterexamples to exclusion, not a safety certification. Native acquisition still refuses with `protection-unverified`.

**Completed checks:** typecheck, build and **58/58 tests passed**, with zero skips on native Windows: the original 46 tests and 12 added control/safety tests. All five empirical probes cleaned their exact artifacts. Injected residual and unknown-entry cases withheld observations, preserved ownership/unrelated sentinels and completed authenticated retry cleanup. Captured diagnostics for an error injected after successful initialization and output allowlisting withheld canaries and temporary paths; M2a.2 did not test initialization-failure or partial-initialization paths. Documentation review checked 268 relative links/anchors in 30 documents and all 20 WIN anchors. Privacy/scope review of the exact seven changed files and `git diff --check` passed. The kernel, fixture builder, CLI, package/lockfile/scripts, goldens, historical ADRs and M2a.1 record remained unchanged; no helper, dependency installation, real-state access, staging, commit or push occurred.

See [M2a.2 procedures, results and limitations](research/windows-acquisition-controls-validation.md), with official sources [DOC-009](research/evidence-catalog.md#doc-009-node-and-bundled-libuv-sharing-boundary), [DOC-010](research/evidence-catalog.md#doc-010-windows-file-handle-sharing) and [DOC-011](research/evidence-catalog.md#doc-011-windows-object-security-and-inheritance). A documented capability gap completes this gate. Any helper experiment, stronger validation, disposable Codex experiment, adapter or personal canary requires separate approval.

<a id="m2a3-minimal-windows-helper-experiment"></a>
## M2a.3 minimal Windows helper experiment

**Design decision / implementation validation on synthetic inputs — 2026-10-05:** separately authorized test-only PowerShell 7/.NET helper, in-memory SID enforcement, current-user-only protected descriptors and competing Node handles. Baseline `0e6aad743cea969c26dc816bb3461ebc3c12593f`; helper changes uncommitted during measurement. Node 24.18.1/libuv 1.52.1, PowerShell 7.6.5/.NET 10.0.11, `win32`/`x64`, Windows release `10.0.26300`. Restricted agent execution refused the root DACL update and cleaned the empty run. Ordinary-account execution outside that sandbox succeeded without Windows elevation. Filesystem type, other-account effective access and all Codex context remain unknown.

**Observed:** independent root/child descriptor readback matched the selected policy; an additional Everyone-read ACE on an empty scratch file was refused. Explicit retained FileShare.Read handles admitted a reader, rejected a writer, rejected rename/unlink and rejected an already-open writer. Released controls succeeded on the same fixtures. Two-source copying retained all selected handles; a second-file sharing failure produced no destinations. Source bytes/identity/size/modification/change timestamps were unchanged during measured acquisition intervals. Specified error/captured-diagnostic injections withheld canaries; partial-copy cleanup and authenticated cleanup retry succeeded. No atomicity, hostile-race, other-account or process-attributed zero-write claim follows.

**Completed checks:** typecheck, build and **72/72 tests passed**, zero skips with explicit Windows helper opt-in: the existing 58 plus 14 new tests. The ordinary opt-out run passed 60 with 12 empirical helper cases skipped, which is not helper validation. All exact-run artifacts were removed, including the explicitly reported cleanup-fault residual after authenticated retry. Documentation checks covered 286 relative links/anchors across 31 documents and all 20 WIN anchors. Privacy/scope review covered the exact eight changed/new files; `git diff --check` passed. Independent review remains pending before any integration proposal. See [procedures, authorization and limitations](research/windows-helper-experiment-validation.md). Native kernel refusal, existing fixtures, CLI, package/lockfile/scripts and historical ADR/M2a.1/M2a.2 records remain unchanged. No later gate, staging, commit or publication is authorized.

<a id="m2a4-synthetic-helper-integration"></a>
## M2a.4 synthetic helper integration

**Design decision / implementation validation on synthetic inputs — 2026-10-05:** separately authorized after independent M2a.3 review, against baseline `13b49dca09517140efaf289ef08e320db4adbbe3`. The test-only path reuses the unchanged fixture builder with protected scratch, complete selected source handles, helper-only acquisition/analysis copy writes and verification while sources remain held. Node owns bounded selection, file identity/stability, analysis and exact-run cleanup. The ordinary native path still refuses; no production interface or real source is introduced.

**Observed:** standalone SQLite, JSON, WAL/SHM and the combined five-file set passed. Analysis saw the committed WAL-dependent row. Compatible readers succeeded; competing writes, rename and unlink failed through final verification, and released controls succeeded. A writer on the later SHM companion refused after two earlier handles opened and before any destination existed. Root/destination/post-analysis descriptor mismatch, source/set changes and helper/protocol/diagnostic failures withheld success. Partial-copy injection required both an exact allowlisted phase and an independently checked bounded destination write. Cleanup uncertainty withheld results; authenticated synthetic retry removed residuals without changing ACLs. Other-account effective access, hostile races, atomic database/companion acquisition and all Codex behavior remain unknown.

**Completed checks:** typecheck/build passed; explicit Windows opt-in passed 107 with zero skips, while the ordinary run passed 64 with 43 empirical skips. Documentation review checked 299 relative links/anchors across 32 documents and all 20 WIN anchors; privacy/scope review covered the exact 10 proposed files and `git diff --check` passed. Exact artifacts, including represented residuals after authenticated test recovery, were removed. See [M2a.4 validation](research/synthetic-helper-integration-validation.md). Earlier validation records and ADRs retain their original results. Independent review and a separately approved proposal precede any disposable Codex experiment; M2b/M2c and personal-state access remain unauthorized.

<a id="disposable-codex-isolation-feasibility"></a>
## Disposable Codex isolation feasibility

**Design decision / agent-executed read-only feasibility observations — 2026-10-05:** separately authorized documentation-only slice against clean baseline `5f51ad8f598c0de93743fe86e7ff3aa6112eb1db`, following founder-reported independent M2a.4 review. Windows EditionID was Core and the exact Sandbox launcher was absent. Application-only PATH and fixed Program Files checks found none of the named VirtualBox, VMware Workstation or QEMU executables. Targeted CIM hardware properties were unavailable; capacity, firmware virtualization and active hypervisor remain unknown. No exhaustive installation claim, guest isolation proof or Codex support claim follows.

**Result:** a readiness gap completes the approved slice. A fresh Windows VM remains conditional; no exact mechanism/version is approved for setup. See [the feasibility record](research/disposable-codex-isolation-feasibility.md) and DOC-015–DOC-017 in the [evidence catalog](research/evidence-catalog.md#doc-015-codex-cli-location-authentication-and-persistence-controls). No Codex state, existing guest inventory, personal files or credentials were inspected; no environment, acquisition scratch, code, interface or dependency was added. Native refusal and historical validation records remain unchanged. B0/B1 applicability and retirement decisions remain unchanged.

**Completed checks — 2026-10-05:** `npm run typecheck` and the build within `npm test` passed. The unchanged ordinary suite passed **64 tests, with 43 skips and zero failures (107 total)**, including semantic/counterexample, golden, CLI, synthetic-kernel and supported-Node probe checks. Opt-in helper/integration experiments were not rerun; their skips are not fresh validation. The existing tests reported successful exact synthetic cleanup. Documentation checks covered 314 relative links/anchors across 33 documents and all 20 WIN anchors, with no failures. Privacy/scope review covered all six changed documentation files; source/test/helper/package and historical record diffs were empty, nothing was staged, and `git diff --check` passed. M2a.4's 107 explicit passes above remain historical evidence. No environment setup, Codex state access, installation, commit or publication occurred.

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
