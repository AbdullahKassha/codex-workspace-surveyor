# Candidate state sources

## Status and boundary

**Design decision:** M0 names potential sources without inspecting them. This is an assessment, not a validated schema inventory. No real database, JSON state, session, title, identifier, or private configuration was read.

Generic paths such as `CODEX_HOME` refer to source locations, not personal repository examples. Explicit discovery and acquisition policy will be defined at M2.

## Source assessment

| Candidate | Evidence category and basis | Intended first real-data scope | Unknown / reason for restraint |
| --- | --- | --- | --- |
| `.codex-global-state.json` | Founder WIN-004 and WIN-006 through WIN-008 | Validated project/root/assignment fields only | Freshness, shape, authority, and effective location |
| `state_5.sqlite` or future recognized DB | Founder WIN-005, WIN-007, WIN-009, WIN-012, WIN-015 through WIN-017 | Minimum required metadata columns from isolated acquisition | Schema fingerprint, classification, multiple DBs, WAL |
| Referenced filesystem paths | Founder directory/lifecycle experiments | Bounded existence/accessibility checks | Missing vs inaccessible/offline; aliases and host context |
| Git repository/worktree registrations | Founder WIN-010 | Optional bounded read-only queries at known roots | Ownership, dirty/ignored files, custom roots, side effects |
| Managed worktree directories | Founder WIN-010; official DOC-002 | Optional explicitly bounded roots | Root containment does not prove management or linkage |
| `session_index.jsonl` | Founder WIN-007 | Deferred | Not needed for initial project/CWD model; completeness unknown |
| `sessions/` and `archived_sessions/` | Candidate sources; general usefulness unknown for this product | Enumeration/parsing deferred | Highly sensitive conversation artifacts; incremental value unproven |
| Supported UI and deeplinks | Founder WIN-008, WIN-010, WIN-011, WIN-016 | Manual navigation and qualified guides | UI/version availability; no automatic actions in MVP |
| App Server | Official DOC-001 | Separate research, no scanner dependency | Startup/listing side effects and UI coverage |
| Plugin/integration APIs | Unknown | Later investigation | Host permissions and local-state reach are not established |

Design decisions in the scope column are prospective; no adapter exists.

**Founder-reported supporting note — added 2026-10-04:** supplied by the founder in the Founding Knowledge Gap Audit corrections. Archived UI chats were observed to correspond to `archived_sessions` entries. Exact observation timing/build is unknown, and lifecycle semantics were not investigated deeply enough to establish a rule. This note is not an independent reproduction or a source-coverage guarantee. Research into `sessions/` and `archived_sessions/`, including enumeration/parsing, remains deferred.

## Future bounded boundary evidence: design direction

Project Boundary Diagnostics is separate future scope beyond M1. [WIN-018–WIN-020](project-boundary-observations.md) motivate research, while independently reviewed [DOC-005](evidence-catalog.md#doc-005-configurable-project-root-markers) and [DOC-006](evidence-catalog.md#doc-006-project-instruction-discovery) describe documentation context, not verified Desktop behavior. No boundary adapter or discovery algorithm exists.

| Candidate evidence | Future bounded purpose | Limits / authorization gate |
| --- | --- | --- |
| Root-marker occurrences | Entry names, types, locations and observation times supporting candidate boundaries | Explicitly selected locations/ancestry extent only; no arbitrary parent traversal, content dumps, origin inference, or safe-removal classification |
| Relevant root-marker configuration | Effective marker names, configuration provenance, and known/unknown/disabled policy | Specific authorization and allowlisted relevant settings only; no full private configuration reads or exports; shell settings do not prove Desktop settings |
| Git-recognized roots | Qualified query context/outcome, repository/worktree roots and association, distinct metadata location | Separately authorized bounded Git reads; preserve errors/uncertainty rather than classifying every failure as invalid repository |
| Instruction-file metadata | Names, locations, types/accessibility and exclusion reasons for candidate eligibility/selection | No AGENTS content inspection authorized; metadata/ancestry alone cannot prove loading or following; no instruction-loader emulation |
| Direct discovery/loading observations, if safely available | Qualify inferred versus observed roots and instruction status for a run | Availability and side effects unknown; no App Server startup, log reads, or verification turns authorized by these docs |

This list authorizes neither M0 inspection nor M1 acquisition. M1 remains synthetic-only: no real boundary discovery, filesystem ancestry scans, configuration adapters, Git discovery/classification, instruction contents, or private Codex state. Separate M2-or-later research must name sources, fields, traversal bounds, trust/path context, privacy handling, and side effects. See [Q-16–Q-22](open-questions.md#q-16) and [safety](../safety-and-privacy.md#project-boundary-diagnostics-safety-design-decisions).

## Discovery: design requirements

Do not choose the database with the greatest filename suffix, or treat `state_5.sqlite` as a durable product contract. Identify supported shapes and report ambiguity when several candidates qualify. Do not merge unrelated homes or hosts.

[DOC-003](evidence-catalog.md#doc-003-state-location-configuration) and [DOC-004](evidence-catalog.md#doc-004-native-windows-and-wsl-state) motivate separate discovery validation. A shell variable does not prove the Desktop process's effective location. Worktree coverage must account for configurable roots without searching the whole disk.

Unsupported schemas should disable dependent conclusions. Unknown enum values or missing fields must not become invented projectlessness, empty inventories, or deletion findings. Preserve source disagreements and acquisition intervals.

## Data minimization: design decision

Exclude auth, tokens, prompt previews, transcripts, and log content. Parse only allowlisted metadata. A reported rollout path, if useful later, is a reference claim rather than proof of artifact existence. Do not dump source rows or configuration for troubleshooting.

Private acquisition copies may still contain sensitive fields that are never parsed. Their access, lifecycle, and cleanup need independent validation under [safety requirements](../safety-and-privacy.md).

See [Q-01 through Q-08](open-questions.md) for source and acquisition gates.
