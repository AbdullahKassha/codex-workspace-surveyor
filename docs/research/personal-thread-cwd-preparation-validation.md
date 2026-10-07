# Personal thread/CWD map preparation and future run sheet

## Scope and provenance

**Design decision / synthetic implementation evidence, 2026-10-07:** [ADR 0012](../decisions/0012-personal-thread-cwd-map-preparation.md) prepares one summary-only actual-value mapping path using the existing [two-field adapter](thread-cwd-adapter-validation.md). Baseline is `ee7bd07e3269e6df2853ba0bd122250e4de420ad` plus this preparation change set. This record is not a personal-source observation and supplies no execution permission.

[PCAN-001](personal-canary-observation.md) and [PSQ-001](personal-qualification-observation.md) retain their separate founder-reported provenance and consumed authorizations. No actual personal ID/CWD map has yet been read by this new entry. Preserve the five historical residual disclosures and the separate restricted-context cleanup uncertainty. The reviewed teardown hardening at the baseline prevents that specific test cleanup short circuit; it does not locate or remove earlier residuals.

## Implementation and result boundary

The private coordinator accepts the fixed `thread-cwd` analysis mode. It lazy-loads the unchanged adapter and gives it only its protected analysis capability plus generated namespace/interval. It accepts no personal analysis hooks or arbitrary SQL. The independent actual-value consent and extra personal opt-in are required before the consented operation. The adapter, helper, original manual entry, recovery protocol, product CLI and dependencies are unchanged.

Only the adapter's summary leaves the coordinator, under `mapping`. It describes `status`, `reason`, `policy`, `traversal`, `interpretation`, `rowsRead`, `claims`, `omittedRows`, `ambiguousIds`, `cwdGroups` and `unconsumedColumns`. Ready summaries require final source/acquisition verification, confirmed helper exit and scratch/recovery removal. Safety failure returns `mapping: null`. An unsupported schema, analysis refusal or resource limit may return an unavailable summary only after safety cleanup; it returns no claims or private provenance. Empty and partial results retain their explicit meanings.

`attemptConsumed` tracks the operation boundary, not outcome success. Personal consent alone is insufficient to consume the attempt: the flag is set immediately before the first recovery-location session's `start()` call, after request construction/validation. Construction failure remains unconsumed; failed startup consumes the attempt. The synthetic equivalent is set before harness-source metadata access after injected preflight closure checks. Preflight refusal/cancellation leaves it false; every later outcome, including unexpected exceptions escaping ordinary teardown, retains true. The outer owner converts such exceptions to sanitized unsuccessful results and conservatively reports residual uncertainty if the operation began.

The new manual entry requires a local interactive terminal, the reviewed Node patch, both opt-ins, an explicitly selected PowerShell executable and final confirmation. It derives and displays the temporary parent, uses `ChatGPT,Codex`, and asks only for the source and confirmation phrase. All these ordinary inputs are visible locally. Saved JSON excludes input paths and actual record values. The operator verifies PowerShell/.NET in the selected host before starting; the entry does not add another runtime/version-discovery subprocess. No SDK is needed.

## Synthetic validation

Tests cover visible input/derived values, cancellation/EOF and input bounds, noninteractive refusal, missing opt-ins and consent before filesystem/helper access, consumed/unconsumed boundary failures, protected database-only and WAL/SHM mapping, empty/partial results, unsupported schema and overflow, source/acquisition instability, malformed analysis, exit uncertainty, cleanup refusal and authenticated synthetic recovery. Intended injected phases must be reached. Original-source snapshots and unrelated sentinels survive; a deliberately changed invented source is not restored by acquisition.

Negative consent tests temporarily set opt-in values under interception that would reject any filesystem access or helper startup, and require zero such calls. Two further boundary tests use an invented source with consent flags, intercept request construction or session startup, and throw before any child can launch: no known-folder or recovery-slot lookup executes. These establish the exact distinction between a construction failure and failed startup. Successful integrations use only the synthetic selection, synthetic opt-in and harness-owned stores. No real personal operation or recovery slot is accessed. Each new fixture retains independent exact-run teardown authority, including injected residual outcomes.

Measured on **2026-10-07** with Node **24.18.1**, libuv **1.52.1**, embedded SQLite **3.53.1**, selected installed PowerShell **7.6.6** / .NET **10.0.12**, Windows `win32`/`x64`, release **10.0.26300**:

| Check | Passed | Skipped | Failed |
| --- | ---: | ---: | ---: |
| Targeted MAP preparation, explicit synthetic opt-in | 31 | 0 | 0 |
| Full explicit synthetic helper/canary suite | 274 | 0 | 0 |
| Ordinary suite, ordinary-account context | 146 | 128 | 0 |

The 31 added cases comprise 13 ordinary tests and 18 opted-in synthetic integration/boundary tests. Typecheck and build passed. Full suites include existing adapter limits/authorizers, CANARY/QUALIFY, recovery, semantic/counterexample, text-golden and CLI tests. The final explicit run took approximately 196 seconds, including existing timed recovery tests. No new unconfirmed residual was reported; deliberate residual cases retain independent harness cleanup and assert their exact cleanup. No historical residual search was performed.

Repository review passed for **400 relative links across 43 Markdown documents**, all **20 WIN anchors**, the exact **10-file** scope, private-value pattern checks and whitespace including untracked files. The original adapter, managed helper, original manual entry, recovery worker, qualification inspector, CLI, dependencies, historical ADRs/observations/validation records and residual disclosures are unchanged. Every proposed file was reviewed; no generated/private/recovery artifact is included and nothing is staged. The historical baseline remains **243 explicit passes** and **133 ordinary passes / 110 skips**, with zero failures. Independent review remains required before any new personal authorization.

## Fresh authorization: proposed only

Replace the commit placeholder after preparation and independent review. This wording does not authorize execution until explicitly approved.

> I authorize one standalone private M2b thread/CWD acquisition attempt using reviewed preparation commit `<reviewed MAP preparation commit>`.
>
> Use only the same privately established exact absolute Desktop SQLite database path. After normal shutdown, allow that database alone or that database with its exact `-wal` and `-shm` pair. Check the exact rollback-journal path and refuse its presence. No source discovery or replacement selection is authorized.
>
> The required closure list is `ChatGPT,Codex`, referring to local Desktop and its local runtime. A browser session on chatgpt.com may remain open. Use the existing finite closure checks; no additional package, process-tree or version investigation is authorized.
>
> I authorize whole-file reads, hashing and two protected copies, including content beyond the selected metadata, within 16 MiB per source file and 32 MiB selected content. All original content access must use the reviewed retained read handles denying write/delete sharing. Originals receive no mutation and are never opened through SQLite.
>
> Use the runtime-derived, verified temporary parent and current-user-only protected scratch, with the existing seven-file/three-directory/64 MiB plus 8 KiB bounds. Use the fixed `WorkspaceSurveyor-Canary-Recovery` slot under the Windows Local Application Data known folder, with its separate one-directory/two-file/16 KiB allowance. An existing slot blocks acquisition.
>
> On the separate analysis copy, I authorize the adapter's fixed projected structure checks and `SELECT id, cwd FROM main.threads LIMIT 1001;`. Actual ID/CWD strings may enter private memory to construct source-local claims and exact-string CWD groups. Interpret at most 1,000 rows; a fetched 1,001st row causes whole-map refusal. Keep the existing 16 KiB per-field and 1 MiB cumulative text limits.
>
> I authorize local visible entry/confirmation of the selected database path, derived temporary parent and writer names. I authorize output of sanitized statuses, counts and coverage only. I do not authorize displaying, exporting, persisting or sending actual ID/CWD values, hashes, schema contents, private provenance or recovery material.
>
> Findings must remain withheld until final verification, confirmed helper exit and successful scratch/recovery cleanup. I authorize one explicit RECOVER attempt only for authenticated residuals from this new run. An unrelated/pre-existing slot does not grant recovery permission.
>
> Preflight validation failures, missing opt-ins, cancellation, invalid input, runtime mismatch or closure refusal do not consume this authorization when they occur before final confirmation and before any source/recovery-state access or helper startup. Confirmation alone does not consume the attempt.
>
> Once final confirmation has been accepted and the coordinator begins the consented operation by accessing source/recovery state or starting the helper, the acquisition attempt is consumed regardless of its eventual outcome. A consumed attempt requires fresh authorization for another acquisition.
>
> No automatic retries, increased limits, source repair, process killing, stored-path access, additional tables/columns, filesystem discovery, M2c or visual explorer work are authorized.

The fixed schema statements remain `PRAGMA main.table_list('threads');` and `SELECT cid, name, type, hidden FROM pragma_table_xinfo('threads', 'main') LIMIT 64;`. Defaults and source SQL are not returned. Existing defensive/read-only SQLite controls and exact statement/phase authorizers remain in force.

## Manual procedure after review and fresh approval

1. Verify the approved commit and clean checkout, then build. Confirm Node **24.18.1**, PowerShell **7.6.6**, .NET **10.0.12**. Query `[Environment]::Version` inside the selected PowerShell host; do not use `dotnet --version`. A runtime mismatch stops preflight; Desktop version alone does not require revalidation.
2. Have the exact approved source path privately available. Close local ChatGPT/Desktop normally and allow its Codex children to exit. Keep these local writers closed until completion, including through any authorized recovery. Do not kill processes or run from an agent session.
3. In the unrecorded standalone PowerShell terminal, from the reviewed checkout:

   ```powershell
   $env:WORKSPACE_SURVEYOR_HELPER_PWSH = [Environment]::ProcessPath
   $env:WORKSPACE_SURVEYOR_PERSONAL_CANARY = '1'
   $env:WORKSPACE_SURVEYOR_PERSONAL_THREAD_CWD = '1'
   node dist/test/support/personal-thread-cwd-entry.js
   $LASTEXITCODE
   ```

4. Enter the exact database path visibly. Review the derived temporary parent and closure names, then type `AUTHORIZE ONE PRIVATE MAP RUN`. Input is local terminal data, not a shell command or source-selection environment variable. Do not save/transcribe the input portion.
5. Save and bring back only the sanitized JSON and exit code. `attemptConsumed: false` permits a later manual invocation within the same approval after correcting preflight or cancellation. There is no automatic retry. `attemptConsumed: true` requires fresh authorization for any further acquisition, regardless of result.
6. If this attempt leaves authenticated residuals, invoke `node dist/test/support/personal-canary-entry.js` and choose `RECOVER` once under this run's allowance. The existing recovery entry performs no map inspection. Do not use this allowance for a pre-existing slot or search for residuals. A later cleanup success never releases withheld map findings or authorizes reacquisition.

## Stops and interpretation

Existing selection, closure, companion, sharing, protection, stability, protocol and cleanup refusals remain binding. Unsupported schema or limit overflow consumes an already-started attempt and triggers no alternative mapping. A closure refusal from the acquisition helper is post-boundary; it consumes the attempt. No new pre-confirmation process query is added. Unknown authentication, lifetime or deletion state preserves available recovery controls and withholds findings.

A nonempty successful summary would show that bounded real values were transformed into private claims/exact-string CWD groups and the operation reported successful verification/cleanup. Partial interpretation remains partial. Empty input or no retained claims does not establish a populated map or absence of visible chats. IDs, CWD meaning, membership, physical path identity and complete Desktop history remain unqualified.

Later human-readable or visual output requires a separately reviewed display/retention design and consent for actual values. Projects, worktrees, exports and filesystem inspection remain separate scope. No map is retained for later display, so a real explorer would need fresh acquisition consent. Atomic companion consistency, live acquisition, hostile races, transient writes, abrupt termination and secure erasure remain unproven. No staging, commit, push or personal execution is part of preparation completion.
