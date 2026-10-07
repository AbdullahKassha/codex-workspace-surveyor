# ADR 0012: Summary-only personal thread/CWD map preparation

- Date: 2026-10-07.
- Status: accepted for synthetic preparation; independent review and fresh personal execution consent remain required.
- Category: design decision supplementing [ADR 0011](0011-thread-cwd-adapter-preparation.md).

## Fixed operation and private values

Prepare one fixed `analysis: 'thread-cwd'` branch in the existing private coordinator. Invoke the reviewed adapter through a fixed lazy import on the protected analysis-copy capability. Personal callers cannot supply analysis callbacks, SQL or adapter provenance. Generate an opaque source namespace and an interval enclosing acquisition through final cleanup. Keep claims inside the coordinator and return only the existing adapter summary after source/acquisition verification, confirmed helper exit and authenticated cleanup. Original CANARY/QUALIFY actions and the managed helper/recovery behavior retain their existing controls.

The new standalone entry requires both `WORKSPACE_SURVEYOR_PERSONAL_CANARY=1` and `WORKSPACE_SURVEYOR_PERSONAL_THREAD_CWD=1`, plus separate prior approval and the local phrase `AUTHORIZE ONE PRIVATE MAP RUN`. The coordinator separately requires explicit actual-value consent. These gates do not grant permission by themselves. Preparation exercises invented fixtures, injected closure observations and harness-owned recovery slots only.

Reuse ordinary `main.threads`, exact ordinary declared-TEXT `id`/`cwd`, at most 64 ordinary columns, the fixed projected structure queries and `SELECT id, cwd FROM main.threads LIMIT 1001;`. A 1,001st fetched row detects overflow and withholds the entire map. Interpret at most 1,000 rows; permit 16 KiB UTF-8 per field and 1 MiB cumulative encountered ID/CWD text, including omitted-row strings. No pagination, automatic retry, alternative mappings or additional application columns are introduced. These limits do not bound all SQLite execution time or peak allocation.

IDs remain opaque and source-local. CWD strings remain exact, with no normalization or filesystem access. Duplicate/conflicting claims remain ambiguous; null/nontext/empty required values produce omissions and partial interpretation. Additional ordinary columns are ignored and indicated only by the existing unconsumed-column flag. Versions are provenance, not an acceptance gate; no prior personal schema inventory exists for drift comparison.

## Attempt consumption

Explicit final confirmation alone does not consume the authorization. Before source/recovery access or helper startup, preflight failures, missing opt-ins, cancellation, invalid input, runtime mismatch or an already available closure refusal remain unconsumed. This slice adds no separate pre-confirmation process query.

After accepted confirmation, set `attemptConsumed` immediately before the first consented source/recovery-state operation or acquisition/recovery-location helper startup. The personal path reaches this boundary at the existing recovery-location session's `start()` call, after request construction/validation succeeds. A construction failure remains unconsumed; a failed startup consumes the attempt. In synthetic tests, the equivalent boundary precedes the first harness-source identity access, after injected preflight closure observations.

Keep the flag through every subsequent success, refusal or exception, including an unexpected teardown exception. A closure refusal reported by the acquisition helper is already post-boundary. An unavailable/unsupported schema, limit refusal, existing recovery slot or cleanup failure after this boundary also consumes the attempt. Only a fresh authorization permits another acquisition after consumption. No automatic retry or persistent authorization ledger is introduced; the operator retains the sanitized result and applies the authorization boundary.

## Local entry and output

The dedicated entry asks visibly for the exact previously authorized database path and final confirmation. It derives the temporary parent through the runtime and existing checks, uses the fixed reviewed closure list `ChatGPT,Codex`, and derives recovery storage through the existing Windows known-folder mechanism during the consented operation. It does not discover sources or request user/profile/temporary paths that can be derived. No personal username is embedded.

Visible input is bounded to 2,048 UTF-16 code units, rejects control input, and restores terminal input mode after completion, cancellation or EOF. Use an unrecorded standalone terminal. Input and local temporary-parent confirmation are deliberately visible; they must not be included in saved output, repository records or chat. The saved result contains only statuses, counts, coverage, booleans and the policy label. Raw ID/CWD values, private source/provenance values, hashes, schema contents and recovery material are not returned.

Mapping values become unreachable after the coordinator returns its summary. Garbage collection is not secure erasure. Summary-only success validates construction of a bounded private map, not its human interpretation. Display/export of actual pairs is deferred and requires a separate reviewed permission and presentation design.

## Preparation and later authorization

See the [preparation validation and proposed manual run sheet](../research/personal-thread-cwd-preparation-validation.md). Preserve acquisition limits, retained read handles, current-user-only protection, untouched acquisition plus separate analysis, source verification and exact cleanup. Safety failure withholds the mapping summary. An adapter refusal may report only its unavailable summary after safety verification and cleanup; partial interpretation is explicit rather than silently discarded.

No personal run, real recovery-slot access, source discovery, package/process/version investigation, product command, dependency, project/worktree inspection, UI or M2c is authorized by this preparation. [PSQ-001](../research/personal-qualification-observation.md) remains a completed, consumed qualification with no retained copy. A later map attempt needs fresh actual-value/full-copy consent and its own recovery allowance. Historical measurements and residual disclosures remain intact; no historical locator is searched for.
