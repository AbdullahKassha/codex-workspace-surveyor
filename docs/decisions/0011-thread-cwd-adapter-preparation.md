# ADR 0011: Private two-field adapter preparation

- Date: 2026-10-07.
- Status: accepted for synthetic preparation only; independent review and new personal-value consent precede any personal use.
- Category: design decision following [PSQ-001](../research/personal-qualification-observation.md).

## Decision and boundary

Prepare the first narrow M2b adapter under `test/support`, with invented analysis copies only. It produces source-local record-to-stored-CWD claims. It does not classify records as visible chats or reconstruct projects, worktrees or physical directories. Product code, the personal entry, original CANARY/QUALIFY actions, managed helper and recovery policy are unchanged. No public interface, discovery, dependency or personal invocation is introduced.

The input is an owned analysis-copy capability plus caller-supplied source namespace and observation interval, never a path or arbitrary SQL. The synthetic coordinator rejects personal selection before acquisition and uses the existing copied-stage hook. It stages private results until the complete existing acquisition, verification, disposal and cleanup sequence succeeds. Failed safety checks return an unavailable map, even if parsing succeeded or a later recovery removes residuals.

## Required structure and bounded values

Keep [ADR 0010](0010-copied-schema-qualification.md)'s ordinary `main.threads`, exact ordinary declared-TEXT `id`/`cwd`, maximum 64 columns, no hidden/generated columns, fixed projected schema queries and defensive/read-only SQLite controls. Keep defaults and schema SQL out of query results. Phase-specific authorizers and exact statement identity are required. The sole data statement is:

```sql
SELECT id, cwd FROM main.threads LIMIT 1001;
```

Iterate at most 1,000 rows plus one overflow detector. Any 1,001st row withholds the whole map, including when some preceding rows were omitted. This bounds traversal as well as accepted claims. Limit each string to 16 KiB UTF-8 and cumulative encountered ID/CWD strings to 1 MiB. Charge strings in omitted rows too, so duplicate-ID tracking cannot bypass the retention bound. Any limit failure withholds the whole map; no truncated success or pagination. SQLite's existing per-value/SQL limits remain separate; no hard execution-time bound is claimed.

Actual ID/CWD strings, absent from PSQ-001's result, are the minimum additional values needed for a map. No additional source columns are necessary. Provenance comes from acquisition, not database timestamps: source namespace, enclosing observation interval and fixed adapter policy. The integration interval starts before acquisition and ends after verified cleanup, intentionally enclosing more than the copy operation.

## Relationships, privacy and coverage

Treat nonempty string IDs as opaque and namespace-local without a UUID requirement. Preserve CWD strings exactly, grouping only exact equality. Do not normalize, resolve, follow or test them as paths. Retain every accepted claim, including duplicate IDs and conflicting CWDs, with explicit identity ambiguity. A valid repeated ID with an omitted CWD still marks its retained claims ambiguous.

Null, nontext or empty required values omit that row and increment a bounded omission count. They imply neither corruption nor projectlessness. Schema/type/value errors must not silently search for alternative columns. An empty table provides a completed selected-table traversal with zero claims, not proof of no Desktop chats.

Keep traversal completeness separate from interpretation: complete within the selected table; partial interpretation for omissions/duplicate-ID ambiguity; unavailable on schema, analysis, limits or safety refusal. This establishes neither full Desktop coverage nor semantic completeness. UI visibility, classification, membership, runtime CWD and filesystem identity remain unknown.

Private record values and provenance live in non-enumerable internal storage. Explicit internal accessors serve synthetic assertions; JSON and diagnostic inspection expose only fixed categories, booleans and counts. No product renderer, persistence or export receives the values. Garbage collection is not secure erasure; no memory-erasure guarantee is made.

## Compatibility and future product requirements

Desktop version is provenance, not an adapter acceptance gate. Acceptance depends on required schema invariants and acquisition capabilities. Additional ordinary columns within the existing bound are accepted and ignored; report only an unconsumed-column flag. No prior personal schema inventory exists, so this is not a detected change. A future Schema Drift Detection feature requires a separately designed baseline. Incompatible required invariants and unsupported structures fail closed; unrelated generated columns remain unsupported under the current policy.

Derive profile, LocalAppData and temporary locations through supported OS/runtime mechanisms; never embed a personal username. Future product flows should derive and verify inputs where possible, and reserve hidden input for materially secret values. Ordinary paths and writer names should not be hidden by default merely because they are local. These are recorded product requirements, not a redesign of the reviewed private entry or permission to display personal values now.

Future preflight measures the selected PowerShell host's runtime with `[Environment]::Version`; an SDK probe is unnecessary. A Desktop version change alone should be informational, while demonstrated source/closure/acquisition capability changes remain relevant. Preserve the closed-app control and separately scoped consent; no version-only reset of all safety validation is needed.

## Completion and later consent

See [synthetic adapter validation](../research/thread-cwd-adapter-validation.md). Independent review follows synthetic completion. A later personal map would require one fresh authorization explicitly permitting actual bounded ID/CWD reads, continued private-memory handling, source/closure/acquisition scope and cleanup/recovery allowance. This decision authorizes no personal run, M2c, UI, project/worktree discovery, classification, stored-path access or export.
