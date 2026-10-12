# Live-friendly acquisition feasibility — 2026-10-11

## Decision: NO-GO under the accepted safety contract

**Agent-observed disposable experiments; recommendation, not personal acceptance.** None of the evaluated approaches establishes a safe replacement for closed-app Refresh. Node Online Backup produced consistent SQLite copies in the tested cases, but source-side SHM effects, checkpoint interference and independent JSON/index timing remain material. Protected copying deliberately excludes conflicting writers and is unsuitable as a transparent live reader. Successful raw copying is insufficient evidence of consistency.

Keep the accepted reusable UI, previous successful snapshot and closed-app Refresh. Phase 2B durable authorization is deferred: the founder reports no current repeated-approval friction. No personal acquisition, process gate, launcher, session implementation, dependencies or permission store changed. Baseline: `8f5ecfa`. Historical residuals were neither inspected nor cleaned by this investigation.

## Method and limits

The [opted-in suite](../../test/live-acquisition-feasibility.test.ts) uses the existing invented Explorer fixture allocator and authenticated exact-run teardown. A [dedicated child worker](../../test/support/live-acquisition-worker.ts) accepts only a temporary harness root, retained filesystem identity, matching owner capability, fixed role and fixed builder/source area over inherited IPC. It rejects ordinary invocation without the new research opt-in and external locations before fixture initialization. It is not imported by any product entry.

An outer owner remains alive while separate writer, reader and metadata processes operate. Progress barriers use a fixed owned control file outside the sources; bounded IPC supplies the other barriers. Each experiment has a 30-second test/worker ceiling, a 10-second backup-progress deadline, an 8,192-callback work budget, a five-second barrier deadline and bounded IPC waits. These are research stop conditions, not a new product cancellation contract. Deliberate crashes terminate only retained, PID/capability-confirmed child handles; supervisor-disconnect cases close inherited IPC. The independent outer owner survives every case; loss of that owner and machine/power failure recovery are not established. No Desktop or unrelated process is queried or stopped.

Destinations are in exact, initially empty owned directories with current-user-only managed DACLs applied and read back before content is written. Source ACLs are not changed. The fixture envelope permits at most 16 MiB per file and 64 MiB total fixture content; the live selected SQLite/JSON/index set stays below the existing 32 MiB acquisition limit. The SQLite payload is approximately 1.59 MiB. Existing helper copy/recovery limits remain unchanged. Root ownership, known entries, child exit and exact teardown determine cleanup; unknown lifetime or cleanup stops later cases.

Measurements combine IPC operation records, file identity/size/mtime/ctime/hash observations, bounded directory-event observations, SQLite progress, transaction latency, checkpoint results and copied-only integrity/generation checks. DB/WAL/SHM measurements occur around controlled phases; SQLite source statements belong only to the newly mutable research fixtures. Writer checkpoints are intentional workload operations; the acquisition worker never checkpoints, repairs or changes source journal mode.

**Observability limit:** this is not a process-attributed filesystem or mapped-memory trace. Directory events can coalesce, sampling misses transients, and Windows byte-range locks can make raw SHM reads fail with `EBUSY`. Such a hash is explicitly unavailable, never counted as unchanged. A two-write restore and a create/delete control leave identical final JSON bytes and no transient file despite known mutations. Absence of observed changes cannot establish zero source effects, even when hashes match. Access-time behavior, hostile same-user races, machine/power failure and alternate filesystems are not certified. No tracing infrastructure, installation or elevation was introduced.

The missing-SHM creation case is outside the existing complete-companion selection rule. Preserving that rule avoids this particular creation case, but does not establish immutable existing SHM or complete live-source observability. The decision also depends on the existing-SHM evidence, observed interference and consistency/measurement limits; it does not assume every read-only open creates a new file.

The accepted [safety contract](../safety-and-privacy.md) already disclaims an atomic cross-source transaction. The generation-skew experiment records that limit, not a new requirement that SQLite and independent JSON always share one transaction. A future proposal would need bounded per-source consistency and explicit cross-source uncertainty compatible with the existing interpretations. Source-side effects and missing observability already prevent GO here.

## Empirical findings

Runtime observed: Windows x64, Node 24.18.1, bundled SQLite 3.53.1, PowerShell 7.6.6, .NET 10.0.12. No Desktop/agent version or real writer behavior was inspected.

| Case | Observation | Meaning |
|---|---|---|
| Existing protected copy, writer first | Acquisition refused with sanitized helper failure; owned scratch cleanup completed | Existing sharing controls do not provide transparent live acquisition |
| Existing protected copy, reader first | SQLite open succeeded but the actual write returned code 8 (`SQLITE_READONLY`); companions appeared and final acquisition refused as unstable | Open success is not write compatibility; unchanged source-set checks remain necessary |
| Backup, open writer with uncommitted generation 9 | Both batch sizes copied committed generation 0 with valid integrity and relational invariant; DB/WAL hashes matched | Database consistency succeeded in these cases; SHM hashing during the held transaction was unavailable due to locking |
| Backup, WAL image with missing SHM | `readOnly` source opening created SHM; copied database passed integrity; source DB/WAL hashes matched | Concrete source-directory mutation, sufficient to reject this as universally side-effect-free |
| Pinned source read transaction | Backup retained generation 1 while writer committed generation 2; writer TRUNCATE checkpoint returned busy, with 393 log frames and 392 checkpointed; after reader closure it completed | Pinning can stabilize the SQLite view while delaying checkpoint/WAL retirement |
| Writer disconnect/reconnect | Last-writer closure removed companions; reopening recreated WAL | Companion lifecycle is not stable merely because Desktop is open or idle |
| External commit during backup | Controlled commit caused progress to restart; both batch sizes completed valid snapshots while a bounded writer burst continued | Backup restart is real; completed database consistency does not imply a fixed start time or bounded completion under indefinite churn |
| Ordinary copy across WAL reset | Copied DB passed integrity at generation 0 after source generation 1 was checkpointed; before/after DB hash changed | Readability alone would accept stale data; accepted source-stability verification would refuse this case |
| Independent metadata writers | Valid DB generation 0 coexisted with valid atomically replaced JSON and appended index generation 1 | SQLite consistency does not provide a cross-file transaction; synthetic generation markers are test oracles, not assumed personal fields |
| Partial JSON/index and truncation | Partial records failed parsing; index truncation produced a valid new one-record index | Parse success and per-file validity do not establish temporal correspondence or history completeness |
| Cancellation | Pre-open cancellation opened no source; throwing at backup progress rejected the attempt; a completed backup held before publication was cancelled through the unchanged session controller, retaining the previous synthetic view and discarding the candidate | Useful lifecycle behavior on this pinned runtime; no personal live adapter was enabled |
| Acquirer crash / supervisor disconnect | Exact child exit confirmed; writer checkpoint succeeded afterwards; partial destination could remain until owned teardown | Process exit releases observed locks; it does not itself remove partial copies |
| Writer crash during an uncommitted transaction | Backup retained committed generation 3 and excluded generation 4; comparable SHM hashes differed after reader closure, with the source file set unchanged | Recovery-related source coordination effects remain relevant even with `readOnly` |

Recorded completed focused run, single 64-commit control and 64-commit concurrent burst per batch setting:

| Batch pages | Control writer p95 / max (ms) | Concurrent writer p95 / max (ms) | Backup elapsed (ms) | Progress restart indications | Failed commits |
|---:|---:|---:|---:|---:|---:|
| Default 100 | 3.03 / 7.31 | 2.94 / 5.21 | 29.47 | 1 | 0 |
| 1 | 1.93 / 2.97 | 2.18 / 5.94 | 65.12 | 3 | 0 |

WAL size at the end of each burst was 2,142,432 bytes; this is not a reader-attributed growth measurement. Uncommitted-writer backups took approximately 16/24 ms; callback cancellation took approximately 6 ms. Barrier/IPC time is included in backup elapsed time. Restart indications count nondecreasing remaining-page samples after a controlled external commit, not a native restart counter. The short bursts, scheduling noise and differing completion times do not establish a performance guarantee or absence of interference. The explicit pinned-reader checkpoint experiment independently demonstrates interference.

## Official references and alternatives screened

- **Documented:** Node's [version-pinned backup API](https://nodejs.org/download/release/v24.18.1/docs/api/sqlite.html#sqlitebackupsourcedb-path-options) wraps SQLite backup, requires an open source connection and exposes batch/progress controls. [SQLite's contract](https://www.sqlite.org/c3ref/backup_finish.html) describes per-step source locks, external-write restarts and destination rollback when an unfinished backup is finalized. Neither API provides atomic SQLite-plus-JSON/index acquisition.
- **Pinned implementation evidence:** Node's [24.18.1 backup implementation](https://github.com/nodejs/node/blob/v24.18.1/src/node_sqlite.cc#L453) catches a progress-callback exception and finalizes the backup before rejecting. The empirical cancellation case exercises that path. There is no documented AbortSignal option in this version; the experiment does not generalize callback cancellation to other runtimes or to every blocking native operation.
- **Documented:** SQLite's [WAL coordination](https://sqlite.org/walformat.html) uses SHM and read marks. [Read-only WAL conditions](https://www.sqlite.org/wal.html#read_only_databases) do not promise no SHM creation/modification. The new multiprocess findings extend, rather than replace, the earlier [read-only SHM counterexamples](../../test/explorer.test.ts).
- **Rejected workaround:** `immutable=1` skips locking and change detection; changing the file can yield incorrect results or corruption errors. It cannot describe an active source truthfully. `mode=ro` alone does not establish companion immutability. [SQLite URI documentation](https://www.sqlite.org/uri.html)
- **Serialization:** Node's [serialize method](https://nodejs.org/download/release/v24.18.1/docs/api/sqlite.html#databaseserializedbname) still operates on an opened database connection. Inference: changing the destination representation does not remove the demonstrated source-open/WAL coordination issue or coordinate JSON/index. No separate serialization experiment was needed to disprove it as a source-open bypass.
- **Filesystem snapshots:** [Windows VSS](https://learn.microsoft.com/en-us/windows/win32/vss/volume-shadow-copy-service-overview) is a coordinated requester/provider/writer architecture. It is not the current bounded file-reader mechanism. No provider capability, permissions, application consistency or transient effects were established here; deploying snapshot infrastructure exceeds this focused, installation-free increment. No VSS snapshot or host trace was started.

## Validation and next boundary

Typecheck/build and the final focused suite passed **14/14**, with no skips. The initial empirical run passed 10 and failed three assumptions: two raw SHM measurements encountered `EBUSY`, and a successful SQLite open was incorrectly treated as proof of writable access. Every initial fixture was cleaned. The corrected suite explicitly records unavailable SHM measurements and tests the actual write plus source-set refusal; no production safeguard was relaxed. A later refinement tests pre-publication cancellation through the accepted controller rather than a local boolean.

The final crash diagnostic explicitly closes the reader and reports hash comparability and source-set change independently, preventing an unavailable hash from being mistaken for a byte change. Its targeted verification passed: both hashes were readable, the source set was unchanged, and SHM bytes differed. This does not certify absence of other transient effects.

The first full opted-in run passed 620/621, with no skips: one sustained-writer test received no completed-copy metadata and failed its success-only assertion. Its exact failure category was not retained, so it is not retrospectively attributed to a particular cause. Cleanup completed. The worker now reports bounded-stop reason, failure phase and numeric SQLite error category; that test accepts an explicitly bounded refusal or SQLite BUSY/LOCKED during backup without publishing a candidate, while unexpected failures still fail. A research test passing on refusal is not evidence of a successful acquisition or a GO result.

**Final validation:** typecheck and build passed. The focused research suite passed 14/14; the corrected crash observation also passed its targeted check. The full opted-in suite against the final research code passed **621/621**, with zero failures, cancellations or skips (approximately 228 seconds). Both sustained-writer backup cases completed in that final run, and every research fixture reported confirmed removal. Relative documentation links/anchors passed (499 across 54 Markdown files), as did whitespace/privacy review. All previously tracked files and the Git index remained unchanged; the change set consists only of this record, the research test and its worker.

No current-run unconfirmed residual has been reported. The older stalled-fixture uncertainty and separately resolved launcher-test residual retain their own history; these tests establish nothing about them.

**Smallest safe path:** retain closed-app Refresh; do not implement a live acquisition adapter from these results. Revisit only when there is a concrete source-independent immutable snapshot mechanism or a producer-supported read contract whose effects, writer interaction and cross-source consistency are independently established. Any proposed mechanism must pass disposable transient-effect, consistency, cancellation and crash/cleanup validation before a separately reviewed integration slice. Personal live access and changes to Desktop gating would remain separate authorization boundaries. New permissions persistence cannot address the demonstrated blockers.

Reproduce the focused suite after `npm run typecheck` and `npm run build`, using the existing installed PowerShell executable:

```powershell
$env:WORKSPACE_SURVEYOR_RUN_LIVE_FEASIBILITY='1'
$env:WORKSPACE_SURVEYOR_RUN_CANARY_PREPARATION='1'
$env:WORKSPACE_SURVEYOR_RUN_EXPLORER_PREPARATION='1'
$env:WORKSPACE_SURVEYOR_HELPER_PWSH='C:\Program Files\PowerShell\7\pwsh.exe'
node --test dist/test/live-acquisition-feasibility.test.js
```

For the full opted-in suite, also enable the existing `WORKSPACE_SURVEYOR_RUN_HELPER_EXPERIMENT` and `WORKSPACE_SURVEYOR_RUN_HELPER_INTEGRATION` gates, then run `node --test dist/test/*.test.js`. These opt-ins authorize only this synthetic research path; they do not select or enable personal acquisition. Nothing was staged, committed or pushed.
