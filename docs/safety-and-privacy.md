# Safety and privacy

## Current M2a.1 boundary: design decisions

The founder separately authorized the narrowed synthetic acquisition kernel, tests, supporting docs and exact current-run synthetic artifact cleanup on 2026-10-04. [ADR 0008](decisions/0008-synthetic-acquisition-kernel.md) records this scope. The kernel exists only under `test/support`; CLI imports and bundled-demo behavior remain unchanged. Real sources and disposable Codex experiments are excluded.

Native scratch protection is unverified and refuses before source copying. Tests explicitly simulate that prerequisite using invented bytes only. Ownership tokens, unique paths, mode flags, before/after hashes and static write-boundary checks do not prove restrictive Windows ACLs, lock exclusion or process-attributed zero writes. No helper/subprocess is authorized. See [validation and limits](research/synthetic-acquisition-validation.md).

Cleanup verifies only this run's fixed synthetic layout and removes files individually; unknown entries, redirection or cleanup failure yield residual status. Do not extend this into a cleanup sweep or private-data recovery tool. No secure erasure or forced-crash recovery is promised. All later research, helpers, real adapters and personal canaries require separate scoped approval.

## Retained M1 CLI boundary: design decisions

M1 authorization covered the synthetic CLI foundation only. Its inputs are bundled invented scenarios and output is text; there is no user-data input path, real Codex read, App Server inspection, filesystem/Git/boundary discovery, AGENTS diagnostics, private acquisition, corrective action, verification turn, or visual UI. Represented paths are strings, never read targets. No local folder, Local Project, Thread assignment, or CWD migration is part of M1. See [ADR 0007](decisions/0007-synthetic-cli-foundation.md).

The runtime imports bundled modules and uses terminal I/O only. Control characters are escaped; usage and internal errors do not echo arbitrary arguments, stacks, or local paths. Developer builds/tests may access their repository and dependencies and launch the synthetic CLI. Import guards are regression checks, not proof of sandbox isolation. Review every changed file; fixture prefixes alone do not establish privacy.

M1 approval covered the private package, development dependencies, synthetic code/tests and supporting docs; it did not authorize M2. The later M2a.1 approval permits only the current synthetic harness and exact-run cleanup described above. Private research, commits, pushes, publication, other cleanup and any migration still need separate authorization.

## Historical M0 boundary: design decisions

M0 is authorized for documentation and repository hygiene only. Its inputs are the supplied founder observations, official documentation, and synthetic examples. It does not authorize reads of actual Codex state, private configuration, databases, sessions, titles, identifiers, logs, or transcripts.

A future private-state investigation needs explicit, specific authorization describing the target, purpose, bounded data, and handling. A milestone approval does not silently authorize every research step. No commits, publication, repository visibility changes, or cleanup are authorized by M0.

Do not implement packages, scanners, CLI code, acquisition, Git discovery, reconciliation, rule execution, or UI during this slice.

## Repository privacy: design decisions

All identifying examples must be invented. Do not commit real personal paths/usernames, thread/project IDs, conversation titles, prompt text, screenshots, database images, sessions, reports, or private artifacts. Use synthetic constructions rather than sanitized source exports: residual identifying data is easy to miss.

Generic field names, source filenames, environment variables, and placeholder locations are acceptable technical vocabulary. The experiment records explicitly label their replacement values synthetic.

Ignore patterns provide defense in depth. They do not block force-added files, embedded strings, tracked content, Git history, or uploads elsewhere. Review each changed file before staging or publication. Do not install a scanner just to review M0.

## Future product boundary: design decisions

The intended process is **observe → reconcile evidence → explain → guide a supported action → re-observe**.

Workspace Surveyor must not directly mutate Codex-owned SQLite databases or Codex-owned JSON state. This prohibition is unconditional; any reversal requires an explicit superseding decision/ADR. Do not repair, checkpoint, vacuum, rewrite, or delete source state. See [ADR 0001](decisions/0001-observation-and-action-boundary.md).

Supported actions are preferred for user workflows, but a method name or documented API does not prove an operation has no side effects. Changes made by Codex through its supported mechanisms are distinct from direct mutation by Workspace Surveyor. Supported workflows do not waive the prohibition. See [DOC-001](research/evidence-catalog.md#doc-001-app-server-listing-side-effects).

The first CLI has no cleanup/migration executor. Manual guides do not launch commands, open/delete worktrees, alter assignment, or send turns automatically. Future action capabilities require separate scope, authorization, preconditions, failure handling, and verification.

## Future acquisition requirements: design decisions, mechanics unknown

Closed-app acquisition is the supported-baseline candidate. Closing a window alone does not establish that all writers have stopped. Process checks, where appropriate, are best effort and must never kill a user's processes.

Private copies outside Codex-owned directories and the repository are acceptable in principle. Validate owner-restricted storage before copying, preserve needed WAL/companion state, detect source instability, and parse only allowlisted metadata. Do not open original source databases through the analysis driver.

No atomic cross-source snapshot is promised. Distinguish a quiescent acquisition from a complete transactional snapshot. If sources change or required companions cannot be acquired, mark the audit partial/unsupported and suppress dependent conclusions. Do not use an immutable setting to misrepresent a changing source.

Driver behavior, permissions, WAL handling, recovery boundaries, resource limits, and no-source-write guarantees require testing before implementation is accepted. Analyze isolated copies; do not load arbitrary SQLite extensions or source-supplied executable logic. Never repair the source to make it readable.

Scratch cleanup must be confined to verified Workspace Surveyor-owned storage. Interrupted runs may leave private copies; report this without silently removing unrelated directories. Do not promise secure erasure. M0 neither creates copies nor tests acquisition against private data.

Optional Git discovery must use bounded read operations, fixed arguments, and timeouts. No prune, repair, remove, checkout, filesystem deletion, or repository-script execution is part of diagnosis. Worktree ownership must be established separately from path location.

## Project Boundary Diagnostics safety: design decisions

This explanatory capability requires separate research and implementation authorization beyond M1. An unusual or disagreeing root is informational, not proof of a defect, repository ownership, or cleanup need. A Codex filesystem project boundary is not a sandbox boundary, access-control boundary, or file-ownership boundary.

Do not infer that:

- `.git` always means a valid Git repository, or an empty-looking `.git` is safe to delete.
- Codex's discovery boundary equals the Local Project root or Git root.
- `.git` is the only possible root marker, or marker behavior in one build is a permanent contract.
- A known default documents the local effective policy when configuration is unknown.
- A Git error proves an invalid repository.
- AGENTS discovery, loading, or compliance can be reconstructed from filesystem ancestry alone.
- Preventing marker creation establishes how existing markers are interpreted.

Do not recommend deleting/creating markers, changing root settings, moving instruction files, Git repair, marker cleanup, classifying artifacts as safe to remove, or proving abandonment. Keep scope out of complete Codex configuration debugging, an instruction interpreter/emulator, Git repair tooling, root-marker management, general filesystem cleanup, and automated organization changes.

Future bounded reads require explicit targets and fields; no full private configuration, AGENTS contents, arbitrary ancestry scans, or real Codex-state acquisition is authorized during M1. Keep eligible, selected, observed loaded, and actually followed instructions distinct; disclose trust, timing, alias, and coverage uncertainty. Historical marker manipulations in WIN-018 are evidence, not a supported-action recommendation.

See the [conceptual model](relationship-model.md#project-boundary-distinctions-design-decisions), [proposed explanation families](compatibility.md#r-boundary), and [source gates](research/state-sources.md#future-bounded-boundary-evidence-design-direction).

## Future reports and snapshots: design decisions

- Auditing is local-first, with no telemetry, uploads, update checks, or model calls by default.
- Local terminal views may show titles and paths; sanitize control characters.
- Shareable outputs use allowlisted fields and report-local aliases for identifiers, titles, private path components, links, and remote URLs.
- Private exports require explicit intent and an output location. Mark their sensitivity clearly.
- Do not include raw source rows, configuration, prompt previews, transcripts, or scratch copies in reports.
- Sanitization must cover diagnostics, exceptions, metadata, and future HTML rendering; unsalted hashes are not sufficient anonymization.
- A snapshot is an observation record, not a backup or recovery mechanism.
- Lost source coverage cannot be interpreted as deleted entities or resolved warnings.

Precise output contracts will be defined when implemented. Privacy tests must use planted synthetic canaries rather than real user data.

## Migration and cleanup limits: evidence and design

**Founder evidence:** [WIN-015 through WIN-017](research/cwd-migration.md) show an external rename/fallback risk and a successful temporary Local Project bridge in two reported cases.

**Design decision:** preserve the workflow as experimental. Assignment alone is not migration completion. A verification turn executes in a potentially changed context and mutates Codex state; runtime location must be checked before reading the marker or doing further work. Stop on disagreement.

Internal rows, null project IDs, missing spawn edges, inaccessible paths, and absent observed chats do not establish deletion safety. Do not call a folder abandoned based on these clues. Managed worktrees require their owning application's supported lifecycle and separate review.

See [migration guidance](workflows/projectless-cwd-migration.md), [worktree review](workflows/managed-worktree-review.md), and [security reporting](../SECURITY.md).
