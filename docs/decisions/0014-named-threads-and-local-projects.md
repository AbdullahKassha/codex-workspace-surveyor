# ADR 0014: Named threads and Local Projects

- Date: 2026-10-07.
- Status: accepted for implementation with invented fixtures; fresh personal acquisition/browser-display consent remains required.
- Category: design decision, following [ADR 0005](0005-cli-first-and-early-visual-experience.md) and [PLD-001](../research/personal-local-display-observation.md).

## Product boundary

M2 is completed validation infrastructure. Build the first focused browser explorer: Projects and exact stored-location groups, titled records, search and evidence details. Do not further develop the terminal viewer. No repository/worktree discovery, organization action, migration, transcript analysis, export or public API belongs here.

The founder explicitly chose a synthetic Project fixture format while current Desktop registry keys/types remain unknown. Do not infer real keys from saved folders or historical assignments. Real Project decoding stays unavailable; titled-location functionality remains usable. A subsequent fixed decoder can consume only a separately qualified allowlist, not a general JSON/schema browser. [Qualification requirements](../research/m3a-explorer-preparation.md#future-qualification) define the prerequisite.

## Sources and model

The SQLite label hypothesis is ordinary declared-TEXT `main.threads.title`. Existing personally qualified ID/CWD invariants remain mandatory. Missing/incompatible title capability yields an Untitled record label; it does not discard usable location claims. No alternative column search, prompts, timestamps, rollout paths, archive fields or `project_id` joins.

The new source profile binds an existing database set plus one explicitly selected JSON file. Preparation is synthetic-only. Legacy selection, limits and personal entry behavior remain unchanged. The new profile permits two or four selected files, 16 MiB/file, 32 MiB combined source content, nine scratch files/three directories/64 MiB plus 8 KiB, and the existing separate recovery-control allowance. Recovery v2 authenticates the expanded exact inventory; v1 remains supported. The helper retains every selected read stream through copy/analysis/final verification. There is no atomic companion-set claim.

Core observations carry source namespaces, acquisition interval, capabilities and coverage. IDs are opaque. CWD/root strings stay exact and uninspected. Duplicate/conflicting/dangling references survive reconciliation; matching strings do not resolve ambiguous records. Stored assignment, missing observation, unknown, conflict and dangling are distinct. Explicitly unassigned semantics remain unqualified and are not synthesized. No exclusive Project→folder→thread ownership hierarchy is enforced.

Separate pure model/readers/browser modules from test fixtures, protocols, fault injection, personal opt-ins and canary entries. The acquisition bridge supplies an owned analysis capability, then releases a one-use snapshot only after final verification, helper exit and authenticated scratch/recovery removal. Safety failure releases nothing. This concrete boundary is internal, not a plugin architecture.

## Browser boundary

Short-lived loopback-only server; dataset in process memory, session token in URL fragment/header, exact host/origin checks, no external assets, storage, logs, cacheable responses, file export or automatic refresh. No data is embedded in HTML or executable source. Render strings via text nodes with reversible control/bidi escaping and exact underlying grouping. Full paths are text, never filesystem actions. Closing or ten-minute expiry removes server-held references; browser capture, retention and secure erasure cannot be guaranteed.

Versions are provenance, not rejection keys. Required schema/capabilities govern acceptance. Extra ordinary columns are unconsumed observations, not established drift. Derive OS/runtime locations; never embed a personal username or request safely derivable inputs. The synthetic demo has no personal selection branch. A later personal browser run needs new full-copy/title/Project-value/browser-delivery permission after independent review.
