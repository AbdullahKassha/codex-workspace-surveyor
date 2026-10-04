# Evidence catalog

## Claim categories

| Category | Meaning | Recording requirement |
| --- | --- | --- |
| Founder-observed experiment | A result reported by the founder from an actual experiment | Observation ID, date/environment, missing context, result, limits |
| Official documentation | A claim established by a reviewed official source | Source ID, URL, access date, surface, claim, limitations |
| Design decision | An intentional Workspace Doctor policy | Decision/ADR reference and reason; not a Codex guarantee |
| Assumption | Provisional premise needed to progress | Assumption ID and consequence if false |
| Unknown | Unestablished fact or unresolved choice | Research question, permission requirements, and expected outcome |

Section labels apply to their contents unless a paragraph or row states otherwise. Synthetic examples are illustrative constructions, not a sixth kind of empirical evidence.

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

Source: [founder's article](https://kassha.xyz/blog/git-metadata-vs-codex-project-boundary/), published 2026-08-22; reviewed 2026-10-04. This group is founder-observed Windows evidence, historically version-uncertain and not independently reproduced by Workspace Doctor. It does not change the original 17-observation baseline or inherit B0's database/schema context. Detailed dates, methods, limits, and synthetic reconstruction are in the [boundary record](project-boundary-observations.md) and [B1 matrix](../compatibility.md#boundary-context-b1).

| ID | Founder-reported subject | Detailed record |
| --- | --- | --- |
| WIN-018 | Controlled A/B/C/D marker experiment with fresh-thread response measurements | [Record](project-boundary-observations.md#win-018) |
| WIN-019 | Historical filesystem markers and Git recognition differed | [Record](project-boundary-observations.md#win-019) |
| WIN-020 | Clean-workspace test did not reproduce earlier entry creation | [Record](project-boundary-observations.md#win-020) |

Article discussions of official documentation, source code, and issue reports are not promoted to official evidence by citation alone. DOC-005 and DOC-006 below were reviewed directly and remain separate from the founder observations.

## Official documentation records

These are separate from B0 and B1. Each page was reviewed on **2026-10-04**. Public documentation can change; record a new review when a material claim changes. No downloaded page copies or screenshots are stored here. Product names reflect the sources' current presentation, not a retroactive identification of the founder's build.

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

## Recording future evidence: design decision

For a distinct experiment, add an observation with its own ID, date, versions, permissions, sanitized procedure, result, limits, and affected rules. Record whether it reproduces, contradicts, or supersedes earlier evidence. Link it into the compatibility matrix. Retain earlier records unchanged except for clearly identified corrections or navigation fixes.

A supporting supplement may be added under an existing WIN ID when it refines the same experiment without changing the original recorded result. Label it as supporting evidence, attribute the reporter/source, record the addition date and observation date/context when known, and state its measurement limits. Preserve original results and distinguish supplements from independent reproduction. No new WIN ID is needed for such additions. Correct summaries and reconstruction tables when their wording exceeds the combined evidence; do not infer causality from check order.

Do not substitute a synthetic test for a product lifecycle experiment. An unknown stays unknown until the necessary evidence exists.
