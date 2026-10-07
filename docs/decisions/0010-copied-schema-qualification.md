# ADR 0010: Bounded copied-schema qualification preparation

- Date: 2026-10-06.
- Status: accepted for synthetic preparation; independent review and fresh personal consent required before execution.
- Category: design decision, supplementing [ADR 0009](0009-personal-closed-app-canary.md).

## Context

[PCAN-001](../research/personal-canary-observation.md) is the founder's report of one successful schema-only canary. It establishes no reusable schema contract or application-record semantics. Its reported cleanup leaves no retained copy for further inspection, and its one-run authorization is consumed. Historical ADRs and the preparation record retain their original timing and limitations.

## Decision

Prepare one private `QUALIFY` action using the existing protected acquisition, separate analysis copy, retained source handles, verification, persistent recovery and exact cleanup. The original `CANARY` action keeps its original two statements and result shape. No product CLI, public SQL input, dependency, discovery, helper modification or native acquisition mode is added.

The sole candidate is `main.threads`, with ordinary, non-generated `id` and `cwd` columns declared TEXT. These names are hypotheses, not current Codex contracts. Require exactly one ordinary table in `main`, 2–64 columns, and no hidden/generated columns anywhere in that table. Views, virtual/shadow tables, missing or differently named fields, unsupported types and oversized structure are unsupported. Do not search for alternatives. Defaults and source SQL are not selected.

The fixed statements, in order, are:

```sql
PRAGMA main.table_list('threads');
SELECT cid, name, type, hidden FROM pragma_table_xinfo('threads', 'main') LIMIT 64;
SELECT typeof(id), typeof(cwd), id IS NULL, cwd IS NULL FROM main.threads LIMIT 1;
```

The founder explicitly approved the projected second statement because the proposed direct xinfo PRAGMA would also return defaults. [DOC-022](../research/evidence-catalog.md#doc-022-projected-schema-metadata) records the official SQLite contract. Fixed trusted setup statements enable query-only and disable trusted schema before the phase authorizers are installed. Read-only/defensive opening, disabled extensions and existing SQLite limits remain in force.

Statement identity and phase-specific authorizers work together: allowing column reads for `typeof` alone cannot prohibit a raw `SELECT id`. The database connection never escapes the qualifier, and its synthetic fault hook accepts only the exact-text preparation gate. No source-supplied SQL executes. An object shadowing the schema table function refuses.

Results contain only accepted/unsupported structure, present/absent sample, ID/CWD text and nullness booleans, and existing safety statuses. Schema names/types remain in memory. Empty tables produce no row evidence; null or nontext values are observations, not corruption or projectlessness. One unordered row establishes neither coverage, uniqueness nor the meaning of CWD. No stored paths are returned or followed. Result bounds do not establish a hard execution-time bound.

Unsupported structure still completes final source/acquisition verification and cleanup before returning its sanitized refusal. Any analysis, verification, protocol or cleanup failure withholds the qualification sample. Recovery semantics and limits are unchanged; no metadata is retained for later analysis.

## Authorization and consequences

Synthetic preparation uses invented databases and harness-owned recovery slots only. Personal `QUALIFY` additionally requires a separate opt-in and consent phrase, but those controls do not grant authorization. The future authorization must explicitly cover copied schema metadata and the one type/nullness sample, whole-file exposure, reconfirmed source/companions/writers/runtime, unchanged limits and its own cleanup/recovery allowance. It must be run externally after all writers, including the authorizing chat, close.

Independent review precedes that request. A successful future qualification could justify proposing a narrow M2b adapter for the observed structure, with coverage limits. It does not authorize M2b, a full audit, live or atomic acquisition, source mutation, exports, or general personal-state access. See the [preparation validation and manual procedure](../research/personal-qualification-preparation-validation.md).
