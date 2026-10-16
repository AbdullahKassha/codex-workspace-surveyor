# Evidence catalog

**Accepted explorer milestone, reported 2026-10-10:** the founder reports acceptance and independent review at `d15c78b121074c78a3b3492e369c3e89c85ca93e`. The local commit was independently confirmed during the audit; remote push and personal acceptance are supplied outcomes. [Current validation](explorer-local-read-only-validation.md#accepted-milestone-2026-10-10) retains the preceding 545/545 fixture result, later integration validation, failed attempts and residual disclosures. [Compatibility](../compatibility.md) summarizes applicability; this catalog remains the evidence index.

Preparation history is recorded in [ADR 0014](../decisions/0014-named-threads-and-local-projects.md), [ADR 0015](../decisions/0015-personal-titled-browser-preparation.md), [ADR 0016](../decisions/0016-local-read-only-explorer-and-title-previews.md), and their linked validation records. Older unavailable/pending statements retain their original dates. No new personal inspection follows from documentation integration.

### SRC-001: Public title hypothesis

- Source: OpenAI [threads migration](https://github.com/openai/codex/blob/main/codex-rs/state/migrations/0001_threads.sql), reviewed 2026-10-07.
- Category: official public implementation source, mutable main branch, not an installed-release contract.
- Observed source structure: the ordinary thread table includes a TEXT title alongside ID/CWD.
- Limit: no mapping to the founder's runtime revision or visible Desktop title semantics. Fixed copied-state invariants and later founder comparison are required.

### DOC-024: Local Project folder semantics

- Source: official [Projects and chats](https://learn.chatgpt.com/docs/projects), reviewed 2026-10-07.
- Documented claim: local Projects may attach multiple folders with a selected primary folder.
- Limit: no JSON registry/assignment serialization contract or current private source location is established. Historical WIN-006 remains historical comparative evidence, not a guessed current decoder.

## Claim categories

| Category | Meaning | Recording requirement |
| --- | --- | --- |
| Founder-observed experiment | A result reported by the founder from an actual experiment | Observation ID, date/environment, missing context, result, limits |
| Fixture-tested observation | Measured OS, Git or acquisition behavior on controlled owned fixtures | Test/validation reference, execution context, method, result and limits; not real Codex lifecycle certification |
| Official documentation | A claim established by a reviewed official source | Source ID, URL, access date, surface, claim, limitations |
| Implementation-derived claim | Behavior established by inspection of the current code or a regression assertion | Commit/module/test reference; distinguish inspection from an executed result |
| Design decision | An intentional Workspace Surveyor policy | Decision/ADR reference and reason; not a Codex guarantee |
| Assumption | Provisional premise needed to progress | Assumption ID and consequence if false |
| Unknown | Unestablished fact or unresolved choice | Research question, permission requirements, and expected outcome |

Section labels apply to their contents unless a paragraph or row states otherwise. Illustrative synthetic examples are not empirical observations. Controlled fixtures can measure real filesystem/Git/API behavior, but do not reproduce Desktop lifecycle semantics. Inferred, contradicted, reproduced and superseded qualify a claim or its relationship to later evidence; they do not replace its source category.

**Design decision:** provenance, confidence, severity, and action safety must remain separate. A founder-verified experiment does not make a prediction certain on an unknown release. `VERIFIED`, `OBSERVED`, `INFERRED`, and `UNKNOWN` may later describe evidential status, but cannot replace the source category. Do not assign numeric confidence without a defined basis.

## Original founder evidence baseline B0: WIN-001–WIN-017

Source: founder's supplied planning-session account of Windows experiments on **2026-10-04**. The observations were not independently reproduced during M0. No private source artifacts were read or retained for M0.

Platform: Windows, native Codex Desktop local workspace context as reported. Windows build, desktop version, agent version, Git version, and exact acquisition timing are unknown. SQLite references name `state_5.sqlite`; full schema, schema fingerprint, and version semantics are unknown. JSON shape is only known through the reported fields. Detailed context is in [compatibility](../compatibility.md#baseline-context-b0).

Identifying values have been replaced with synthetic ones. UI action labels, generic filenames, and field names are preserved as technical vocabulary. The sanitization preserves behavior, not original strings.

| ID | Founder-reported subject | Detailed record |
| --- | --- | --- |
| WIN-001 | Project and folder identity are separate | [Record](windows-2026-10-04.md#win-001) |
| WIN-002 | Projectless thread can have real CWD | [Record](windows-2026-10-04.md#win-002) |
| WIN-003 | Main threads can share a workspace | [Record](windows-2026-10-04.md#win-003) |
| WIN-004 | Project IDs differ across sources | [Record](windows-2026-10-04.md#win-004) |
| WIN-005 | Null SQLite project ID despite visible membership | [Record](windows-2026-10-04.md#win-005) |
| WIN-006 | Global assignments matched UI more closely | [Record](windows-2026-10-04.md#win-006) |
| WIN-007 | Permanent thread deletion and metadata lag | [Record](windows-2026-10-04.md#win-007) |
| WIN-008 | Project removal preserves chats/files | [Record](windows-2026-10-04.md#win-008) |
| WIN-009 | Internal rows remain after visible cleanup | [Record](windows-2026-10-04.md#win-009) |
| WIN-010 | Managed worktree UI removal updates Git | [Record](windows-2026-10-04.md#win-010) |
| WIN-011 | Thread deeplinks and CWD-copy UI | [Record](windows-2026-10-04.md#win-011) |
| WIN-012 | Extended Windows prefix in SQLite paths | [Record](windows-2026-10-04.md#win-012) |
| WIN-013 | Nested Local Projects | [Record](windows-2026-10-04.md#win-013) |
| WIN-014 | Projectless thread survives project removal | [Record](windows-2026-10-04.md#win-014) |
| WIN-015 | External rename, missing CWD, fallback workspace | [Record](windows-2026-10-04.md#win-015) |
| WIN-016 | Temporary Local Project migration bridge | [Record](windows-2026-10-04.md#win-016) |
| WIN-017 | Second migration with descriptive destination | [Record](windows-2026-10-04.md#win-017) |

The [compatibility matrix](../compatibility.md) links each observation to a proposed implication and future comparison criteria.

## Separate founder boundary-research group B1: WIN-018–WIN-020

Source: [founder's article](https://kassha.xyz/blog/git-metadata-vs-codex-project-boundary/), published 2026-08-22; reviewed 2026-10-04. This group is founder-observed Windows evidence, historically version-uncertain and not independently reproduced by Workspace Surveyor. It does not change the original 17-observation baseline or inherit B0's database/schema context. Detailed dates, methods, limits, and synthetic reconstruction are in the [boundary record](project-boundary-observations.md) and [B1 matrix](../compatibility.md#boundary-context-b1).

| ID | Founder-reported subject | Detailed record |
| --- | --- | --- |
| WIN-018 | Controlled A/B/C/D marker experiment with fresh-thread response measurements | [Record](project-boundary-observations.md#win-018) |
| WIN-019 | Historical filesystem markers and Git recognition differed | [Record](project-boundary-observations.md#win-019) |
| WIN-020 | Clean-workspace test did not reproduce earlier entry creation | [Record](project-boundary-observations.md#win-020) |

Article discussions of official documentation, source code, and issue reports are not promoted to official evidence by citation alone. DOC-005 and DOC-006 below were reviewed directly and remain separate from the founder observations.

## Separate founder remnant investigation: WIN-021

[WIN-021](explorer-local-read-only-validation.md#win-021) records the handoff’s bounded marker-only worktree investigation, reported 2026-10-10 with exact experiment dates and app/build context unknown. Three nominated repository registrations, two marker-only directories, three stale path references, six selected IDs with zero spawn edges, and the separately approved reversible quarantine are scoped founder observations. This is distinct from WIN-010 and B1, not universal absence or removal safety. The current explorer consumes neither saved writable-root references nor spawn-edge rows.

**Reconciliation of duplicates:** the founder explicitly confirmed the handoff migration is WIN-017, not a third migration success. Its original [record](windows-2026-10-04.md#win-017), [reconstruction](cwd-migration.md) and limits remain unchanged; only WIN-016 supplies successful bridge removal. Project-removal and internal-record context remains linked to WIN-008/009/014. Later title, existence and Windows failure findings are dated in the current validation record instead of duplicating WIN-012 or the original investigation.

## Separate founder CLI-resumption observation: WIN-022

[WIN-022](cli-resumed-thread-classification.md#win-022), reported 2026-10-16 against accepted baseline `3fdc111777e19c5919a8b5c5f0cc8e3635410511`, records one Desktop-visible Thread with no assignment observed, unknown Surveyor visibility and a Needs review row. The corrected invocation used `--no-daemon resume --all`; creation/resumption history and any CWD transition remain unverified. The implementation trace explains conservative eligibility and separates instruction scope from directory failure. No personal metadata was inspected or private values retained. This adds a coverage limitation, not a new classification or universal CLI behavior, and retires no earlier observation.

## Separate personal canary evidence: PCAN-001

[PCAN-001](personal-canary-observation.md) records the founder's report on 2026-10-06 of one separately authorized standalone personal canary: three selected files, successful readability/stability checks, confirmed exit, scratch and recovery controls reported removed, exit code 0 and no recovery required. Exact execution time is unknown; intended commit `44453cd` and preceding runtime/Desktop version observations are not attested by the result JSON. The record separately attributes the PowerShell 7.6.6/.NET 10.0.12 synthetic requalification (179 passed/0 skipped explicit; 79 passed/100 skipped ordinary; no failures). No personal identifiers, paths, hashes or contents are retained. This does not reproduce or retire any WIN observation or establish schema compatibility. New qualification requires separate personal consent after synthetic preparation and review.

## Separate personal qualification evidence: PSQ-001

[PSQ-001](personal-qualification-observation.md) records the founder's 2026-10-07 report of a successful separately authorized standalone qualification: accepted candidate structure, one sample with non-null TEXT ID/CWD values by type only, three files, successful reported verification/disposal/cleanup, exit 0. Actual record strings were not returned. Executing commit/runtime are not attested by the JSON. The record separately attributes preceding package/process checks, founder handle/version observations and synthetic validation, plus the SDK-preflight and background-process observations. It neither validates all records nor establishes classification or CWD semantics. No source or recovery slot was re-inspected to record it; no WIN evidence is retired.

The [two-field adapter validation](thread-cwd-adapter-validation.md) is synthetic implementation evidence under [ADR 0011](../decisions/0011-thread-cwd-adapter-preparation.md), not another personal experiment. Later actual-value reads require fresh consent. Existing DOC-018/DOC-022 support the API/query mechanics; schema acceptance policy and bounds are design decisions.

## Separate personal map/display observations: PMAP-001 and PLD-001

[PMAP-001](personal-thread-cwd-observation.md), reported 2026-10-07, retains 139 claims / 15 exact stored-CWD groups, zero omissions/ambiguities, three selected files and reported verification/cleanup. Intended implementation was `b1449d8`; executing context and cleanup were not independently re-inspected. [PLD-001](personal-local-display-observation.md), also reported 2026-10-07, retains 146 claims / 15 groups, no omissions/ambiguities and successful reported verification, cleanup, display closure and exit 0. Neither supplied a complete reconstructable dataset or establishes universal UI visibility, runtime CWD or physical identity. Authorizations were consumed; preparation and legacy consent gates remain separately dated in their linked records.

## Separate MAP preparation: synthetic implementation evidence

The [personal MAP preparation record](personal-thread-cwd-preparation-validation.md) adds synthetic implementation evidence under [ADR 0012](../decisions/0012-personal-thread-cwd-map-preparation.md). It tests fixed invocation of the existing adapter, consent and attempt-consumption boundaries, summary-only release and inherited safety cleanup. It contains no new personal-source observation, runtime/source mapping or additional data permission. PCAN-001, PSQ-001, WIN observations and historical residual disclosures remain unchanged.

## Official documentation records

These are separate from B0 and B1. DOC-001–DOC-008 were reviewed on **2026-10-04**; later entries carry their own review dates. Public documentation can change; record a new review when a material claim changes. No downloaded page copies or screenshots are stored here. Product names reflect the sources' current presentation, not a retroactive identification of the founder's build.

### DOC-001: App Server listing side effects

- Source: [Official App Server documentation](https://learn.chatgpt.com/docs/app-server).
- Surface: Codex App Server, `thread/list`.
- Documented claim: default listing can scan JSONL logs to repair metadata; `useStateDbOnly: true` avoids that scan-and-repair path.
- Limit: this does not establish zero side effects from server initialization or other methods, complete Desktop UI coverage, or applicability to the founder's unknown build.
- Design implication: no automatic App Server dependency for the scanner. Investigate all side effects before treating an integration as read-only.

### DOC-002: Worktree roots and lifecycle

- Source: [Official worktree documentation](https://learn.chatgpt.com/docs/environments/git-worktrees).
- Surface: local managed worktree workflows.
- Documented claim: the default root is under `CODEX_HOME/worktrees`, but users can configure another root. The page describes lifecycle protection and snapshot/restore behavior.
- Limit: root containment alone does not establish ownership, retention, recoverability of every file, or the exact behavior of a particular build.
- Design implication: report discovered scope and use qualified, version-aware worktree guidance.

### DOC-003: State location configuration

- Source: [Official environment-variable documentation](https://learn.chatgpt.com/docs/config-file/environment-variables).
- Surface: CLI, IDE, App Server, and installers as listed by the source.
- Documented claim: `CODEX_HOME` controls state locations for listed consumers; `CODEX_SQLITE_HOME` can separate SQLite state, with `sqlite_home` configuration taking precedence.
- Limit: the page does not establish the Desktop process's effective configuration from the scanner's shell environment.
- Design implication: validate discovery per surface and provide explicit overrides later.

### DOC-004: Native Windows and WSL state

- Source: [Official Windows documentation](https://learn.chatgpt.com/docs/windows/windows-app).
- Surface: Windows desktop and WSL usage.
- Documented claim: the native Windows app uses the Windows Codex home; WSL CLI uses its Linux home by default and does not automatically share history/state.
- Limit: this does not establish path equivalence, cross-host identity, macOS behavior, or configuration on the founder's build.
- Design implication: treat WSL as a separate environment requiring validation.

### DOC-005: Configurable project-root markers

- Source: [Official advanced configuration: project root detection](https://learn.chatgpt.com/docs/config-file/config-advanced#project-root-detection), directly reviewed 2026-10-04.
- Surface: Codex configuration/project discovery documentation; effective Desktop configuration remains unverified.
- Documented claim: discovery walks upward from CWD to a project root; `.git` is the documented default marker. `project_root_markers` customizes marker names; an empty list skips parent search and treats CWD as root. The page also describes trust gating of project-local configuration.
- Limit: no local effective settings, historical Desktop applicability, marker-creation behavior, or Git validity are established by this review.
- Design implication: retain policy knowledge/uncertainty and separate marker interpretation from creation. Do not infer default settings when configuration is unknown.

### DOC-006: Project instruction discovery

- Source: [Official custom instructions: discovery](https://learn.chatgpt.com/docs/agent-configuration/agents-md#how-codex-discovers-guidance), directly reviewed 2026-10-04.
- Surface: Codex instruction discovery documentation; described run-start timing is not independently verified Desktop timing.
- Documented claim: the instruction chain is built once per run. Project discovery follows root-to-CWD ancestry, with CWD-only fallback if no root is found. Selection checks `AGENTS.override.md`, then `AGENTS.md`, then configured fallback names, at most one per directory; files combine root-first. Global guidance is separate.
- Documented caveats: an instruction file may be empty; empty files are skipped. Instruction selection/inclusion is subject to the documented combined size limit, configured through `project_doc_max_bytes`.
- Official-documentation-derived limitation: ancestry and file presence alone do not prove selection, loading, or following. Documentation does not establish a particular file's eligibility or compliance in a local run; trust/context and historical-build applicability require validation. These limits are official-source evidence, not founder observations.
- Design implication: preserve these evidence distinctions and exclusion reasons; do not emulate the instruction loader or read instruction contents in M1.

### DOC-007: GitHub repository renaming

- Source: [Official GitHub repository rename guidance](https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository), reviewed 2026-10-04.
- Surface: GitHub repository settings and Git remote configuration; not Codex state.
- Documented claim: repository renames redirect existing repository traffic and Git operations, with documented exceptions such as project-site URLs and hosted actions. GitHub recommends updating existing clone remotes. Reusing the original repository name breaks redirects.
- Limit: this does not establish local-directory renaming, Codex Local Project reassignment, or Thread/CWD migration behavior.
- Design implication: rename the existing repository in place, update the remote, retain the local workspace, and verify identity/history under [ADR 0006](../decisions/0006-project-naming-and-cli-surface.md).

### DOC-008: Node Windows filesystem limitations

- Source: [Node 24.18.1 filesystem documentation](https://nodejs.org/download/release/v24.18.1/docs/api/fs.html), reviewed 2026-10-04.
- Surface: Windows Node filesystem mode/access checks and documented open flags.
- Documented claim: Windows mode changes do not implement owner/group/other distinctions; `fs.access()` does not check ACLs. The documented Windows open flags provide no caller-selected deny-write/delete sharing parameter.
- Limit: this review does not establish local DACLs, effective Codex locations, hostile-race resistance or a zero-write guarantee. It does not prove that no other mechanism could provide stronger protection.
- Design implication: M2a.1 default acquisition refuses with unverified protection; successful invented-fixture tests explicitly simulate that prerequisite. Helpers require later scoped approval.

### DOC-009: Node and bundled libuv sharing boundary

- Sources: Node 24.18.1 [filesystem API](https://nodejs.org/download/release/v24.18.1/docs/api/fs.html), [bundled libuv version header](https://github.com/nodejs/node/blob/v24.18.1/deps/uv/include/uv/version.h), [Windows open implementation](https://github.com/nodejs/node/blob/v24.18.1/deps/uv/src/win/fs.c) and [exposed constants](https://github.com/nodejs/node/blob/v24.18.1/src/node_constants.cc), directly reviewed 2026-10-05.
- Surface: public Node flags and the version-matched bundled Windows implementation; libuv 1.52.1 matches the measured runtime.
- Official-source claim: the ordinary Windows open branch supplies `FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE`. The internal `UV_FS_O_EXLOCK` branch supplies zero sharing; Node exposes `UV_FS_O_FILEMAP`, but not the exclusive-sharing constant.
- Inference and limit: mapped I/O is not a caller-selected deny-write/delete contract; source inspection is not a supported Node API commitment. No undocumented numeric flag or mapping was executed. This does not prove that every possible Node-associated mechanism is incapable of stronger controls.
- Design implication: preserve native refusal; [M2a.2](windows-acquisition-controls-validation.md) tests ordinary documented opens and records the precise supported-API gap.

### DOC-010: Windows file handle sharing

- Source: Microsoft [CreateFileW documentation](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew), directly reviewed 2026-10-05.
- Surface: Windows desired access, sharing modes and open-handle lifetime.
- Documented claim: incompatible existing access/sharing requests fail; sharing options persist until the handle closes regardless of process context. Delete access includes rename. Exclusive creation is a creation disposition, separate from sharing.
- Limit: the documentation does not identify the sharing parameters actually requested by a Node call or certify atomic multi-file acquisition.
- Design implication: two same-process handles can demonstrate an exclusion counterexample; positive cross-process enforcement and continuously retained handle-set validation remain later scope.

### DOC-011: Windows object security and inheritance

- Source: Microsoft [file security and access rights](https://learn.microsoft.com/en-us/windows/win32/fileio/file-security-and-access-rights), directly reviewed 2026-10-05.
- Surface: per-object security descriptors, DACL evaluation and ACE inheritance.
- Documented claim: object ACLs govern access; a parent descriptor is not used directly to control a child's access. Inheritance rules determine restrictions transferred to children.
- Limit: no actual scratch descriptors, effective rights, alternate-account access or filesystem capabilities were inspected.
- Design implication: any later scratch protection evidence must verify root and child descriptors against an explicit principal policy, rather than accepting mode bits, markers or parent-only observations.

### DOC-012: Managed Windows security descriptors

- Sources: Microsoft [.NET ACL extensions](https://learn.microsoft.com/en-us/dotnet/api/system.io.filesystemaclextensions?view=net-10.0), [security-aware creation](https://learn.microsoft.com/en-us/dotnet/api/system.io.filesystemaclextensions.create?view=net-10.0), [descriptor readback](https://learn.microsoft.com/en-us/dotnet/api/system.io.filesystemaclextensions.getaccesscontrol?view=net-10.0) and [inheritance protection](https://learn.microsoft.com/en-us/dotnet/api/system.security.accesscontrol.objectsecurity.setaccessruleprotection?view=net-10.0), reviewed 2026-10-05.
- Surface: supported Windows managed security descriptors, creation, readback and explicit inheritance protection.
- Documented claim: security-aware directory/file creation and fresh descriptor retrieval are available. Directory creation does nothing when a directory already exists. Protection can remove inherited access rules.
- Limit: APIs alone do not establish actual object policy, hostile-path safety or another account's effective access.
- Design implication: M2a.3 refuses existing child targets and verifies every actual protected object against a current-user-only policy; no native integration follows.

### DOC-013: Managed read sharing

- Sources: Microsoft [FileStream constructors](https://learn.microsoft.com/en-us/dotnet/api/system.io.filestream.-ctor?view=net-10.0) and [FileShare](https://learn.microsoft.com/en-us/dotnet/api/system.io.fileshare?view=net-10.0), reviewed 2026-10-05.
- Surface: explicit existing-file read access and managed sharing parameters.
- Documented claim: FileStream accepts access and sharing choices; FileShare.Read permits subsequent compatible read opens while write/delete sharing require separate flags.
- Limit: not atomic selected-set acquisition, absence-of-mapped-writers proof or Codex compatibility. Windows opening-order and handle lifetime rules remain [DOC-010](#doc-010-windows-file-handle-sharing).
- Design implication: retain all selected Open/Read/FileShare.Read streams throughout bounded copying; test both handle orders and released namespace/write controls.

### DOC-014: Bounded test host invocation

- Sources: [Node 24.18.1 child processes](https://nodejs.org/download/release/v24.18.1/docs/api/child_process.html) and [PowerShell host options](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_pwsh?view=powershell-7.6), reviewed 2026-10-05.
- Surface: explicit executable spawning, piped stdio, hidden windows, profile-free noninteractive script hosting.
- Documented claim: Node supports spawning without a shell and with windowsHide; PowerShell supports NoProfile, NonInteractive and File invocation options.
- Limit: these options provide neither a security sandbox nor bounded protocol/cleanup guarantees by themselves.
- Design implication: M2a.3 uses an explicit opt-in and selected installed host, bounds/sanitizes streams, and confirms helper exit before deletion. No policy bypass or elevation.

### DOC-015: Codex CLI location, authentication and persistence controls

- Sources: official [environment variables](https://learn.chatgpt.com/docs/config-file/environment-variables), [authentication](https://learn.chatgpt.com/docs/auth) and [noninteractive mode](https://learn.chatgpt.com/docs/non-interactive-mode), directly reviewed 2026-10-05.
- Surface: current CLI documentation; no installed Codex version or settings inspected.
- Documented claim: CODEX_HOME controls CLI state location; CODEX_SQLITE_HOME is overridden by sqlite_home configuration. Auth caching may use a file or OS credential store; ephemeral credential storage is process-memory-only. Noninteractive exec supports explicit permissions, while its ephemeral session option omits rollout persistence. The location page links official standalone installers.
- Limit: these controls do not establish OS isolation, Desktop-profile separation, actual schema/filenames or coverage on an untested version. Ephemeral credentials and ephemeral sessions are different controls.
- Design implication: later disposable CLI testing requires a fresh isolated environment, explicit child-only configuration, dedicated credentials and separately approved persistent state creation. No personal authentication import or host Codex invocation.

### DOC-016: Windows disposable environment prerequisites

- Sources: Microsoft [Windows Sandbox overview](https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/), [Sandbox configuration](https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/windows-sandbox-configure-using-wsb-file) and [Hyper-V installation](https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/get-started/install-hyper-v), directly reviewed 2026-10-05.
- Documented claim: Sandbox excludes Windows Home and provides a disposable environment; networking, mapped folders and redirection need explicit configuration. Hyper-V installation guidance excludes Windows Home editions.
- Limit: documentation does not establish the host's enabled features, firmware support, license rights, available resources or safe guest settings. An absent launcher is not an exhaustive installation audit.
- Design implication: do not enable a feature, upgrade an edition or infer a supported isolation boundary from a redirected Codex home. Record the bounded host findings and unresolved setup requirements separately.

### DOC-017: Virtual machine configuration and networking

- Sources: Oracle VirtualBox 7.2 [installation](https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/installation.html), [VM configuration](https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/working-with-vms.html) and [networking](https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/networkingdetails.html), directly reviewed 2026-10-05.
- Surface: one supported-product documentation candidate; not a verified installed product or selected version for execution.
- Documented claim: VM configuration exposes virtual hardware, shared clipboard, drag/drop, folders and network settings; NAT is a network mode rather than a destination allowlist, and host services can be reachable.
- Limit: no guest was created and no configuration, host compatibility, egress policy or effective isolation was tested. No guarantee for other vendors is inferred.
- Design implication: a future exact environment proposal must disable host integrations and validate a separately scoped network policy before Codex execution; NAT alone is insufficient.

## Synthetic implementation validation records: design decision

The [M2a.1 validation record](synthetic-acquisition-validation.md) and [M2a.2 Windows controls record](windows-acquisition-controls-validation.md) describe implementation measurements using invented inputs. M2a.2 observes real Windows filesystem behavior on disposable synthetic files; it is not a founder-observed Codex experiment or an official contract. Preserve each measurement context independently of B0/B1; no WIN record is reproduced, superseded or retired by these checks.

The separately authorized [M2a.3 helper record](windows-helper-experiment-validation.md) appends current-user-only descriptor and controlled cross-process sharing measurements on disposable synthetic objects. It is implementation validation, not Codex evidence or real-source readiness. Native acquisition remains disabled; earlier records retain their original scope and conclusions.

The separately authorized [M2a.4 integration record](synthetic-helper-integration-validation.md) records the end-to-end test-only helper/kernel path on the unchanged invented SQLite/JSON/WAL/SHM fixtures. It reuses DOC-010–DOC-014 contracts, measures retained-handle copying and analysis separation, and records precise injected failure stages. Native acquisition remains disabled; no WIN record, source schema or Codex behavior is validated by this gate. M2a.1–M2a.3 records remain historical evidence with their original limits.

## Read-only environment feasibility record

The [disposable Codex isolation-feasibility record](disposable-codex-isolation-feasibility.md) contains dated, agent-executed bounded host observations, unavailable queries, DOC-015–DOC-017 research and future design decisions. It is not synthetic acquisition validation, a founder-observed Codex experiment or an isolation certification. Its readiness-gap outcome does not authorize setup or execution. Earlier records, WIN IDs and B0/B1 gaps are preserved.

### DOC-018: Analysis-copy SQLite controls

- Source: official [Node 24.18.1 SQLite documentation](https://nodejs.org/download/release/v24.18.1/docs/api/sqlite.html), reviewed 2026-10-06.
- Documented claim: DatabaseSync supports read-only and defensive opening, extension controls, limits and a statement authorizer. Authorizer callbacks can deny statement actions.
- Limit: read-only opening does not certify provenance, safety of an original path, companion consistency or schema compatibility. These APIs do not independently establish a permitted query policy.
- Design implication: canary preparation opens only analysis copies, fixes two schema probes and denies application/catalog-column access. Synthetic tests exercise refusals; no personal SQLite source is opened.

**Dated official-source clarification, reviewed 2026-10-10:** SQLite’s [URI documentation](https://www.sqlite.org/uri.html) states that `immutable=1` skips locking and change detection; changing a supposedly immutable file can produce incorrect results or corruption errors. Its [WAL documentation](https://www.sqlite.org/wal.html) explicitly describes immutable read-only WAL access and explains that WAL carries committed persistent state. These sources do not support a universal “immutable ignores WAL” claim or safe live snapshot guarantee. The separate owned-fixture [read-only SHM test](../../test/explorer.test.ts) and [omitted-WAL test](../../test/acquisition.test.ts) establish narrower counterexamples. Preserve companions and open only protected analysis copies; no direct personal database probe is authorized.

### DOC-019: Finite process-name observation

- Source: Microsoft [.NET Process.GetProcessesByName](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.getprocessesbyname?view=net-10.0), reviewed 2026-10-06.
- Documented claim: the local overload returns Process components for processes matching a friendly executable name without its extension; callers dispose components when finished.
- Limit: a named snapshot is not process discovery, complete writer coverage or prevention of restart. No matching process or current writer list was inspected during preparation.
- Design implication: later consent must supply a reviewed complete name list and no-restart commitment. Preparation uses injected closure observations; the real observation branch remains unvalidated.

## Personal canary preparation record

The separately authorized [preparation record](personal-canary-preparation-validation.md) distinguishes synthetic protected-copy/inspection tests from the unexecuted personal path. Its P1/P2 checkpoint records authenticated persistence before copying, controlled process-restart recovery, short-duration lifetime exclusion, tampering/deletion refusals and pre-spawn validation: 171 explicit passes with no skips and 78 ordinary passes with 93 skips. Subsequent review found the deadline gap during Node deletion. The separately authorized remaining P1 correction moves synchronous scratch deletion into the exclusive-handle helper with per-step Node identity authorization and real deadline-crossing/protocol regressions. Resolved P2 is preserved. The record retains initial measurements and historical controls/feasibility records, discloses development residuals and requires independent re-review and precise future consent. No personal slot was inspected, and no WIN record or Codex behavior is reproduced, superseded or retired.

Final lifetime-correction measurements passed **179** explicit tests with no skips and **79** ordinary tests with **100** skips, zero failures. The controlled interval exceeded 35 seconds while the unchanged Node timeout fired; the concurrent recovery remained busy and a fresh recovery succeeded after confirmed release. Failure and operation-boundary regressions preserve exact-run authentication, sentinels and sanitized evidence. This is not crash durability, hostile-race protection or personal-state readiness.

### DOC-020: Recovery location and flush controls

- Sources: Microsoft [.NET Environment.GetFolderPath](https://learn.microsoft.com/en-us/dotnet/api/system.environment.getfolderpath?view=net-10.0) and [FileStream.Flush(Boolean)](https://learn.microsoft.com/en-us/dotnet/api/system.io.filestream.flush?view=net-10.0), directly reviewed 2026-10-06.
- Documented claim: GetFolderPath returns the specified system special-folder path, or an empty string if it does not physically exist. Flush(true) flushes intermediate file buffers to disk.
- Limit: these APIs alone establish neither access controls, authenticated identity nor power-loss durability. The personal known-folder branch was not executed during preparation.
- Design implication: resolve one fixed private slot rather than searching, refuse an unavailable location, protect and authenticate the record independently, and flush/reread before source-content access. Managed sharing contracts remain DOC-010/DOC-013; graceful synthetic restart tests provide separate implementation evidence.

### DOC-021: Fixed nonrecursive managed deletion

- Sources: Microsoft [.NET File.Delete](https://learn.microsoft.com/en-us/dotnet/api/system.io.file.delete?view=net-10.0) and [Directory.Delete](https://learn.microsoft.com/en-us/dotnet/api/system.io.directory.delete?view=net-10.0), directly reviewed 2026-10-06.
- Documented claim: File.Delete targets the specified file without wildcards and does not throw for an absent file. Directory.Delete supports deleting an empty directory without recursive deletion.
- Limit: these APIs alone do not authenticate identities, enforce exclusion or prevent hostile path replacement.
- Design implication: the private recovery helper deletes only individually authorized fixed members synchronously under its exclusive record handle. Node authenticates each remaining identity before authorizing a step; the helper checks protection and remaining membership. Deadline/cancellation lifetime behavior is separately tested synthetic implementation evidence.

### DOC-022: Projected schema metadata

- Source: official [SQLite PRAGMA documentation](https://www.sqlite.org/pragma.html#pragma_table_xinfo), reviewed 2026-10-06.
- Documented claim: `table_list` identifies object kind and column count; `table_xinfo` includes hidden/generated column indicators. Table-valued PRAGMA functions permit selecting a subset of result columns, with the schema argument supplied after other arguments.
- Limit: direct `table_xinfo` includes default expressions. A projected result does not establish a Codex schema contract, metadata semantics or a hard SQLite execution-time limit.
- Design implication: the founder approved replacing the proposed direct xinfo statement with a fixed `cid, name, type, hidden` projection excluding defaults. [ADR 0010](../decisions/0010-copied-schema-qualification.md) fixes this statement and one type/nullness-only sample. Synthetic validation is recorded separately below.

## Copied-schema qualification preparation

The [qualification preparation record](personal-qualification-preparation-validation.md) records synthetic-only tests of a fixed `main.threads` hypothesis, exact SQL and phase-specific authorizer controls, bounded result shapes, sanitized type/nullness flags, and protected acquisition/cleanup integration. PCAN-001 does not establish that hypothesis. Original canary statements, managed helper, historical records and native refusal are preserved. A new personal authorization after independent review is required; no retained personal copy exists to inspect.

### DOC-023: SQLite oversized-value result

- Source: official [SQLite result codes](https://www.sqlite.org/rescode.html#toobig), reviewed 2026-10-07.
- Documented claim: `SQLITE_TOOBIG` is result code 18 and covers strings/BLOBs exceeding SQLite limits.
- Limit: the code alone does not identify which adapter budget was exceeded or provide a hard time/memory bound.
- Design implication: the private adapter maps the recognized Node SQLite oversized-value error to a sanitized limit refusal and withholds its map. Synthetic tests cover a value rejected by SQLite before JavaScript string materialization, separately from the adapter's tighter UTF-8 budgets.

### DOC-025: Standard Git administrative relationships

- Sources: official [repository layout](https://git-scm.com/docs/gitrepository-layout) and [worktree details](https://git-scm.com/docs/git-worktree#_details), directly reviewed 2026-10-10.
- Documented claim: linked working trees have private administrative directories, a common Git directory, `commondir` metadata and a `worktrees/<id>/gitdir` backlink to the working tree’s `.git` file.
- Limit: the documentation does not certify the explorer’s subset against all Git layouts, formats or installations, nor establish Codex ownership. The observer does not read repository configuration or invoke Git.
- Implementation evidence: [discovery regressions](../../test/discovery.test.ts) create authentic main/linked and separate-git-dir fixtures. Reciprocal supported metadata establishes common identity; a nearer unresolved/unsupported marker blocks ancestor fallback. That conservative boundary policy is a design decision, not an official Git validity judgment.

### DOC-026: CLI resumption and directory selection

- Source: official [CLI reference](https://learn.chatgpt.com/docs/cli/reference#codex-resume), reviewed 2026-10-16.
- Documented claim: resume continues saved sessions; `--all` extends selection beyond the current directory. Current/saved directory choice can depend on configuration or explicit override. `--no-daemon` avoids the shared background server.
- Limit: current documentation does not identify the founder's installed revision, actual selected session/directory, creation history or Desktop Project serialization.
- Investigation: [WIN-022](cli-resumed-thread-classification.md#win-022) keeps the corrected invocation separate from creation/CWD evidence. No Codex CLI or App Server command was executed.

## Recording future evidence: design decision

For a distinct experiment, add an observation with its own ID, date, versions, permissions, sanitized procedure, result, limits, and affected rules. Record whether it reproduces, contradicts, or supersedes earlier evidence. Link it into the compatibility matrix. Retain earlier records unchanged except for clearly identified corrections or navigation fixes.

A supporting supplement may be added under an existing WIN ID when it refines the same experiment without changing the original recorded result. Label it as supporting evidence, attribute the reporter/source, record the addition date and observation date/context when known, and state its measurement limits. Preserve original results and distinguish supplements from independent reproduction. No new WIN ID is needed for such additions. Correct summaries and reconstruction tables when their wording exceeds the combined evidence; do not infer causality from check order.

Do not substitute a synthetic test for a product lifecycle experiment. An unknown stays unknown until the necessary evidence exists.
