# Personal titled-location browser: preparation and qualification

## Authorization and implementation

On 2026-10-08 the founder approved the M3a real-data activation preparation under [ADR 0015](../decisions/0015-personal-titled-browser-preparation.md). Baseline is `9a44df286ffa1cab960a173bc4017e63a7a1bc51`. This record describes synthetic implementation evidence, not a personal execution or a renewed authorization. [PLD-001](personal-local-display-observation.md), the M2 completion record, all prior observations and every historical/unconfirmed residual disclosure remain unchanged.

The private `personal-explorer-entry` prepares a titled-thread/location browser operation using the existing coordinator, readers, model and server. It requests the exact approved database selection visibly, derives temporary/recovery locations, fixes local closure to `ChatGPT,Codex`, and requires `AUTHORIZE ONE TITLED BROWSER RUN`. Prompts are bounded and cancellable, restore input state on EOF/cancellation, and use no source/recovery inspection during preparation.

The new operation requires both personal opt-ins and separate actual-value, title and browser consents. Personal hooks/fault injection and JSON selection refuse. Attempt tracking is independent of MAP result processing: confirmation alone is unconsumed; starting the consented location helper or accessing source/recovery state consumes the attempt. Pre-boundary refusals remain unconsumed. Post-boundary refusals, unsupported schema, analysis failure and cleanup uncertainty consume it. There is no automatic retry.

The new titled path acquires either the exact database alone or database/WAL/SHM, using the existing personal database profile. Its managed helper and recovery protocol need no alteration. Synthetic DB+JSON acquisition remains unchanged; personal JSON acquisition remains refused because no real Project decoder can be nominated from current evidence. This is a deliberate capability boundary, not inferred absence of Projects.

## Copied-state qualification and display

Only analysis copies are opened through SQLite. The existing fixed statements are:

```sql
PRAGMA main.table_list('threads');
SELECT cid, name, type, hidden FROM pragma_table_xinfo('threads', 'main') LIMIT 64;
SELECT id, cwd, title FROM main.threads LIMIT 1001;
```

The reader requires an ordinary table with ordinary declared-TEXT ID/CWD and at most 64 ordinary columns. Accepted declared-TEXT title enables the titled query; otherwise it executes only the existing `SELECT id, cwd FROM main.threads LIMIT 1001;` fallback. No defaults, schema SQL, alternative columns or unrelated records are inspected. Bounds remain 1,000 interpreted rows plus overflow detection, 16 KiB UTF-8 per field and 1 MiB cumulative encountered selected text. These are result bounds, not a hard SQLite execution-time guarantee.

Missing/empty/nontext labels retain Untitled record. Null/nontext/empty required ID/CWD values are omissions; duplicate IDs remain ambiguous. Additional ordinary columns are unconsumed observations, not proven drift. Exact stored strings remain unnormalized and uninspected. Title structure acceptance does not establish Desktop label semantics or visible-chat coverage.

After verification, confirmed helper exit and successful authenticated scratch/recovery removal, nonempty retained claims may become a one-use browser snapshot. Empty/fully omitted copies provide no browser capability. Projects and correspondence remain unavailable/unknown. The unchanged Locations, search and details views display escaped text and explicit coverage/provenance. Summary diagnostics contain counts/statuses only; no record values or private provenance are printed.

The shared entry lifecycle latches cancellation through prompts, acquisition, server startup and final closure. Acquisition is never aborted for cancellation. Its sanitized safety outcome remains intact; snapshots and summaries are withheld after cancellation, no late startup URL is published, and an owned server is closed before completion. Personal fixture cleanup is `not-run` because the entry owns no source fixtures. Browser pagehide closure remains best effort, with ten-minute server expiry as fallback. Browser capture/retention and secure erasure remain outside guarantees.

## Remaining exact Project qualification

One additional source would be an explicitly selected `.codex-global-state.json`, not a discovered home/default. Before its preparation, nominate the exact registry targets from existing sanitized structure or authoritative evidence. The only historical assignment candidate is `thread-project-assignments`; it does not identify registry serialization.

The finite probe would inspect nominated branches for container types, identity key/field representation, exact label/root field names/types/multiplicity and assignment reference types/namespaces. Whole-file parsing exposure requires consent, but unrelated values and dynamic identity keys do not enter structural reports. No top-level key enumeration, replacement-key search, runtime selectors or general schema discovery is allowed. No additional JSON is copied by this entry.

Keys/types suffice to prepare a frozen decoder, not to establish its Project or membership meaning. Namespace correspondence and a small founder comparison must support semantics; unknown correspondence cannot resolve assignments just because strings match. Structure-qualified status remains distinct from semantic evidence. Until that prerequisite is supplied and implementation reviewed, useful titled locations can proceed with Projects visibly unavailable.

## Synthetic validation

Historical M3a baseline remains 380 explicit passes and 232 ordinary passes/148 skips. This preparation adds 54 deterministic/synthetic cases: 38 ordinary cases and 16 empirical cases. No synthetic result qualifies real titles or Projects.

Validation on 2026-10-08, against the baseline plus this working tree:

| Check | Pass / skip / fail |
|---|---|
| Targeted new personal-explorer plus existing explorer suites, explicit opt-in | 114 / 0 / 0 |
| Full ordinary suite | 270 / 164 / 0 |
| Full explicit synthetic suite | 434 / 0 / 0 |
| Typecheck / build | Passed |

The initial restricted-context targeted run could not connect to its own loopback server. It also caught a propagated synthetic input exception and an assertion that ignored reversible path escaping; these were corrected before final validation. Final targeted/full runs used ordinary-account execution outside sandbox restrictions for the existing loopback and owned-object DACL tests, without elevation. The full explicit run took approximately 290 seconds. No new unconfirmed residual was reported.

Tests prove missing opt-ins/consents, personal JSON and every caller-hook/fault route refuse before filesystem/helper access; confirmation alone performs no operation; preflight cancellation/EOF restores prompts; and synchronous cancellation while printing cannot re-enable raw mode. Personal location-request construction/startup fault barriers use invented selections and cannot start a helper or inspect the real slot. Those two tests temporarily enable personal opt-ins only behind the barriers; empirical acquisitions remain synthetic with injected closure observations.

Protected standalone/WAL/SHM tests exercise the new attempt-tracked titled mode, accepted/missing titles, null/empty/nontext title fallbacks, partial rows, empty input, unsupported schema and overflow. Deliberate source change occurs after preparation but before retained source acquisition, proving the metadata-stability refusal rather than merely a denied concurrent write. Acquisition-copy change, proven bounded partial-copy fault, cleanup failure and disposal uncertainty withhold snapshots and summaries. Exact harness recovery preserves invented source sentinels and controls until cleanup succeeds.

Controlled personal-lifecycle tests cover acquisition/startup cancellation, signal during final server closure and uncancelled delivery. They retain sanitized acquisition evidence, discard capabilities, suppress cancelled summaries/URLs and wait for owned closure before listener removal. Personal fixture teardown remains `not-run`. All previous pagehide/expiry, late-response and final-teardown regressions pass in the same targeted suite.

Measured runtime: Node 24.18.1, libuv 1.52.1, embedded SQLite 3.53.1, Windows x64; selected PowerShell 7.6.6 and .NET 10.0.12. These describe synthetic execution, not an installed Desktop/runtime/schema mapping. Checks passed for 462 relative documentation links across 51 Markdown documents, all 20 WIN observations, the 13-file privacy/scope review, tracked/untracked whitespace and `git diff --check`. Historical residual-bearing records, helper/legacy personal entries/two-field adapter/CLI/dependencies and original fixed reader queries remain unchanged. No personal state, real recovery slot or historical residual was accessed. Nothing is staged, committed or pushed. Independent review remains required.

## Proposed fresh authorization — not granted by this record

After independent review, replace the commit placeholder and approve:

> I authorize one standalone personal titled-thread/location browser acquisition attempt using reviewed preparation commit `<reviewed commit>`. Use only the same privately established exact absolute Desktop database. After normal shutdown, accept that database alone or its exact WAL/SHM pair; check the exact rollback-journal path and refuse its presence. No JSON or source discovery is authorized.
>
> Require local `ChatGPT,Codex` closure. Browser chatgpt.com may remain open. No repeated package/process-tree/version investigation is authorized unless an actual required invariant fails.
>
> I authorize whole-file retained-handle reads, hashing and two protected copies, including unselected sensitive data, within 16 MiB per file and 32 MiB selected content. Originals receive no mutation and are never opened through SQLite. Use the runtime-derived verified temporary parent, current-user-only protected scratch, seven files/three directories/64 MiB plus 8 KiB, and the fixed Windows Local Application Data `WorkspaceSurveyor-Canary-Recovery` slot with its separate one-directory/two-file/16 KiB allowance. An existing slot blocks this acquisition.
>
> I authorize the fixed copied-state schema checks and bounded ID/CWD/title query (or the ID/CWD fallback if title is unsupported). Values may exist in private memory and be displayed only through the reviewed short-lived loopback browser session. Preserve opaque IDs, exact CWDs, omissions/ambiguity and unknown membership. Projects remain unavailable. I do not authorize other tables/columns, stored-path access, export, persistence, clipboard actions, saved reports or external transmission. Browser memory and external capture are outside erasure guarantees.
>
> Deliver only after final verification, helper exit and successful scratch/recovery cleanup. Allow one explicit authenticated RECOVER attempt only for residuals from this run; unrelated/pre-existing controls grant no recovery permission. Cancellation awaits owned cleanup and prevents further delivery.
>
> Confirmation alone does not consume the attempt. Before any consented source/recovery access or helper startup, refusal/cancellation remains unconsumed. Once the coordinator begins that operation, the attempt is consumed through every later outcome. No automatic retry; another consumed acquisition requires fresh authorization. No source repair, process killing, configuration change, Git/worktree enrichment, organization action or later milestone is authorized.

## Minimal manual procedure after review and fresh approval

1. Verify the approved commit, clean checkout and build. Use the reviewed standalone runtime: Node 24.18.1, PowerShell 7.6.6 and .NET 10.0.12. Query `[Environment]::Version` within that PowerShell host, not `dotnet --version`. Desktop versions alone are informational.
2. Have the same exact approved database path privately available. Close local Desktop normally and allow its Codex children to exit. Keep them closed through completion and any separately authorized recovery.
3. From the reviewed checkout in an unrecorded standalone PowerShell terminal:

   ```powershell
   $env:WORKSPACE_SURVEYOR_HELPER_PWSH = [Environment]::ProcessPath
   $env:WORKSPACE_SURVEYOR_PERSONAL_CANARY = '1'
   $env:WORKSPACE_SURVEYOR_PERSONAL_EXPLORER = '1'
   node dist/test/support/personal-explorer-entry.js
   $LASTEXITCODE
   ```

4. Enter only the exact approved database path. Review derived temporary/recovery policy and fixed closure names, then type `AUTHORIZE ONE TITLED BROWSER RUN`.
5. Open the ephemeral local URL manually after it is printed. Inspect titles/location groups and already-known record relationships; Projects are unavailable. Close the local session or use Ctrl+C. Expiry is ten minutes. Do not save/share the URL, record inputs, screenshot/export values or reopen Desktop before entry completion and any authorized recovery.
6. Return only sanitized final JSON, exit code and non-identifying recognition outcomes: whether already-known titles were recognizable, whether known stored-location relationships matched, and any observed uncertainty. Do not return title/ID/CWD strings. Such comparison qualifies only the observations actually made, not every record or UI coverage.
7. An unconsumed preflight refusal permits another manual invocation within the same approval; consumed attempts require fresh permission. Use the existing RECOVER entry once only if this run's allowance applies. Recovery cleans artifacts; it does not restore browser findings or authorize acquisition.

Preparation ends at independent-review readiness, without staging, committing, pushing or personal execution. The current real recovery slot and historical residuals are never inspected during preparation.
