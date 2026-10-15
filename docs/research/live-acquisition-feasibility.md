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

## Separate best-effort byte-copy experiment — 2026-10-15

**Founder-authorized changed product requirement; agent-observed synthetic evidence.** Approximate freshness and independent source timing are acceptable for this experiment. Original-source nonmutation and private-copy obligations remain. This is not a reversal of the earlier NO-GO for the quiescent protected acquisition contract. The historical optional live-research group above was not executed; its separately unresolved residual uncertainty remains unresolved.

**Finding:** ordinary byte copying is mechanically viable with a running synthetic producer. It can retrieve usable database/WAL data and independently parseable JSON/index data without deliberately denying producer writes. However, structural integrity alone cannot certify even intra-database logical consistency: a controlled checkpoint between copied pages produced two different committed generations in one structurally valid database. The fixture-specific relational invariant rejected that candidate. Real Codex has no established equivalent universal generation oracle. This experiment supports considering a separately qualified best-effort design, not enabling production live Refresh or promising a coherent transaction snapshot.

### Mechanism and limits

The [new standalone test](../../test/best-effort-copy.test.ts), [byte consumer](../../test/support/best-effort-copy.ts) and [invented producer](../../test/support/best-effort-writer.ts) use a separate `WORKSPACE_SURVEYOR_RUN_BEST_EFFORT_COPY` opt-in. They do not import the historical live-research runner or change protected acquisition, recovery, Explorer or its publication gate. The existing `SyntheticRun` allocates exact owned fixtures and authenticates bounded-layout teardown. A concurrent worker thread owns the producer's SQLite connection; this is not a separate-process isolation test or a Desktop experiment. Consumer source access uses ordinary Node `'r'` handles, never SQLite, a source-writing open, checkpoint or source permission change. Fixture setup and the explicitly mutable producer perform all source writes.

The pinned [Node 24.18.1/libuv Windows implementation](https://github.com/nodejs/node/blob/v24.18.1/deps/uv/src/win/fs.c) requests read/write/delete sharing for this ordinary open path (existing DOC-009). [Windows sharing semantics](https://learn.microsoft.com/en-us/dotnet/api/system.io.fileshare?view=net-10.0) permit compatible subsequent operations; they do not override another handle's restrictions. A refusal remains a refusal, without permission repair or automatic retry.

Fixed exact names select the database, any observed WAL, JSON and index. SHM presence/identity is observed; its bytes are not copied or opened by the consumer. SHM is a transient WAL index: [SQLite's WAL format](https://sqlite.org/walformat.html) explains its reconstruction from WAL. A separate owned analysis directory receives the captured DB/WAL and permits SQLite to rebuild its own SHM there. A no-WAL analysis copy uses immutable mode only on that copy, preventing the previously reproduced companion-creation side effect. No observed WAL is silently omitted. Untouched acquisition bytes remain separate from analysis.

Per attempt: 16 MiB/file, 32 MiB captured bytes, four exact content files, 4-KiB reads and a five-second dispatch deadline. Each file is read to its initially held length; WAL growth beyond that prefix is allowed. Identity replacement, observed disappearance/appearance of companions, rollback-journal presence, short reads and an observed WAL-header reset refuse. Cancellation and deadline expiry stop further dispatch, not an outstanding OS call. Checked identities/reparse/hard-link shape and sampled metadata do not certify hostile-race resistance, ABA absence, atomic copying or freshness. The test rejects invalid SQLite/JSON/index results and its known relational inconsistency. No source generation fields are assumed outside the invented fixture.

Only invented bytes are used. The reused fixture's Windows DACL protection is explicitly simulated/unqualified; this is not permission to use it with private data. A production proposal must retain real owner-restricted storage, complete accounting of analysis-created companions, authenticated cleanup, cancellation/lifetime protection and no publication on cleanup uncertainty. These are independent of the relaxed freshness requirement. No configuration, personal state or recovery artifacts were accessed.

### Observed results

Runtime: Windows x64 in the agent sandbox, Node 24.18.1, libuv 1.52.1, SQLite 3.53.1. No Desktop version or real writer behavior was inspected.

| Scenario | Result and limit |
| --- | --- |
| Idle standalone and open-writer WAL | Usable copied rows; DB/WAL/SHM hashes and sampled size/mtime/ctime unchanged across consumer work while the producer was idle. Access-time behavior and unobserved transient effects are not certified. |
| Consumer handle first, then writer open/commit/checkpoint | All succeeded; TRUNCATE checkpoint reported `busy=0` while the raw database read handle remained open. |
| Concurrent 32-commit burst | Final run: four copies usable, zero copy refusals, zero failed producer commits; WAL grew. Control p95/max 2.781/3.261 ms; concurrent p95/max 1.983/2.032 ms. Single short, scheduling-sensitive samples do not prove zero overhead or a speedup. An earlier successful repeat overlapped ordinary synthetic regressions; this is not an isolated performance benchmark. |
| Append during WAL copying | Captured prefix yielded generation 1 while the producer reached generation 2: valid, deliberately stale data. |
| WAL truncate and reset/reuse during copying | Refused; producer checkpoint reported `busy=0`. A fresh independent attempt retrieved the later generation. No automatic retry was implemented. |
| Last writer closes during a held raw DB read | Writer closed and removed WAL/SHM; changed source set refused. Consumer did not prevent that observed shutdown. |
| Commit/checkpoint after DB bytes were read, before JSON/index | Integrity passed; database generation 0 with JSON/index generation 1 was accepted as best effort. No global transaction is claimed. |
| Checkpoint between two database pages | Integrity passed with table generations 0 and 1; the known synthetic invariant refused publication. This is logical inconsistency, not merely an old coherent snapshot. |
| Corrupt database copy, partial JSON/index, size overflow and cancellation | Candidates withheld. Corruption injection affected only owned copies; all fixtures were removed after confirmed producer exit. |

SQLite itself warns that [copying during a transaction can mix old and new content](https://sqlite.org/howtocorrupt.html#_backup_or_restore_while_a_transaction_is_active). Observed lifecycle checks reduce identifiable hazards but do not prove that every undetected mixture is harmless. Successful `integrity_check` is neither a freshness certificate nor a general application-invariant check. Producer I/O overhead, longer workloads, cross-process behavior and additional sharing restrictions need qualification before a separate production decision. Repeat sampling or stronger per-database stability checks may improve refusal quality without excluding writers; they must not be described as atomicity guarantees or allowed to retry indefinitely.

### Validation and next decision

Typecheck and build passed. Final new focused suite: **10 passed, 0 failed, 0 skipped** (nine scenarios plus the enclosing test, approximately 51 seconds); every new fixture reported confirmed cleanup and worker exit. Worker shutdown waits for its current finite operation before closing rather than dropping an exit request received during work. Initial eight-scenario run also passed; its short burst had three usable copies and one bounded refusal whose subtype was not retained. The final implementation distinguishes cancellation/deadline from other copy/lifecycle refusals. No cause is retroactively assigned to that initial refusal. Without the new opt-in, the entry reports one skip and creates no fixture.

Ordinary relevant regression command (`acquisition`, `explorer`, `windows-acquisition-controls`): **139 passed, 4 failed, 12 skipped**. Two existing link/redirection setups returned sandbox `EPERM`; a third existing redirection assertion received `io` rather than `containment`, consistent with its blocked hard-link setup. The existing loopback fetch returned `EACCES`. No runtime source file changed, no sandbox escalation/retry was attempted, and no cleanup-hook failure was reported in this run. The Windows ordinary-handle probes passed, including reader-first/writer-first writes; rename was denied in this sandbox while unlink succeeded. This is not a full-regression PASS or evidence about older unresolved residuals. No residual search or manual cleanup occurred.

Run only the new experiment with the following commands (no historical research opt-ins):

```powershell
npm run typecheck
npm run build
$env:WORKSPACE_SURVEYOR_RUN_BEST_EFFORT_COPY='1'
node --test dist/test/best-effort-copy.test.js
```

The next production decision must explicitly separate freshness tolerance from undetected intra-database inconsistency; qualify useful schema/relationship checks and cross-source uncertainty; establish practical success/refusal rates and bounded producer impact; and validate the existing real privacy/cleanup guarantees around this different copy mechanism. The evidence does not justify turning the current protected Refresh into this prototype. All five uncommitted roadmap reconciliation files remain unchanged.

## Final best-effort feasibility gate — 2026-10-15

**Separately authorized synthetic investigation; agent-observed evidence and conditional recommendation.** The [gate tests](../../test/best-effort-gate.test.ts), [validated consumer](../../test/support/best-effort-validated-copy.ts) and [independent producer process](../../test/support/best-effort-process.ts) extend the preceding experiment without modifying its files or the production acquisition/recovery path. Each fixture uses a distinct retained child process, matching owned-root capability/identity and PID acknowledgement. No personal state, Desktop experiment, historical live-research invocation or uncertain-residual search occurred.

**Corrected decision after independent-review P1: NO-GO for production integration of this protocol.** The previous Conditional GO is withdrawn: a deterministic injected stale-but-valid SHM header admits a logically mixed candidate despite successful integrity and WAL-prefix checks. Endpoint coherence and its relationship to checkpoint progress are unresolved correctness prerequisites. The positive byte-copy/sharing measurements below retain their limited synthetic scope; the prototype remains test-only. The earlier protected-acquisition NO-GO remains applicable to its different contract.

### Tested strategy and unresolved consistency prerequisite

1. Open only ordinary read handles with the pinned Windows read/write/delete sharing. Retain database and WAL identities; sample the WAL epoch before database copying. Refuse rollback journals, missing/empty epochs, unsupported shapes and resource limits.
2. Copy the database first. Afterwards, read exactly the first 96 bytes of the source SHM file using an ordinary read handle. Require equal duplicated headers, a valid native-endian header checksum, the qualified layout/version/page size and salts matching the sampled WAL epoch. These reads exclude the lock region beginning at offset 120; no SQLite connection, mapping, read mark, source write or permission change is involved.
3. Use that header's reported `mxFrame`, database page count and last-frame checksum to bound the WAL prefix. Validate the WAL header, frame salts and cumulative checksums through that exact committed frame. The currentness of the reported endpoint is not established by these checks.
4. Re-read the captured prefix, recheck the WAL epoch, identities, database size and journal absence. Refuse changes; do not automatically retry. Copy independent JSON/index metadata afterwards. Rebuild SHM only beside the owned analysis copy and require structural/schema checks before considering results. Test generation equality is an external oracle, never an input to the copying decision.

**Documented mechanism and failed inference:** SQLite's [file format sections 4.1–4.5](https://sqlite.org/fileformat2.html#walformat) describe WAL frames, cumulative checksums, reset salts and checkpointing; its [Windows/Unix WAL-index description](https://sqlite.org/walformat.html#walidxhdr) describes the duplicated native-endian header, committed frame count and checksums. The previous argument assumed that a SHM header read after database copying supplied a sufficiently current endpoint to cover checkpoint changes encountered during that copy. That prerequisite is unverified. Microsoft explicitly states that a [mapped view is not guaranteed coherent with ReadFile/WriteFile access](https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-mapviewoffile). Equal header copies, valid checksums and unchanged salts can all describe an older valid endpoint. A checkpoint can advance database pages within the same WAL epoch while leaving the earlier WAL prefix unchanged. That prefix then need not cover the newer pages in a mixed database copy. The protocol neither establishes coherent endpoint visibility nor independently bounds checkpoint progress against the copied pages. Repeated prefix comparisons and structural integrity do not close either gap.

Two useful rejected variants were measured. WAL-first ordering can omit a later checkpoint's pages: it admitted a structurally valid mixed generation even with a stable epoch, matching prefix and valid checksums. DB-first validation of the entire raw WAL instead avoided mixtures but rejected old, unused tail frames left after ordinary reset/reuse, including two attempts against a coherent idle generation. Reading the published endpoint fixed that availability problem without guessing that mismatched frames were harmless. An uncommitted transaction that starts a new epoch has no published endpoint and refuses; uncommitted spilled frames after a committed endpoint are excluded.

This remains a finite experiment: the preceding 16-MiB/file and 32-MiB captured-content limits, fixed exact names and five-second dispatch deadline apply. The new validator additionally caps byte-read work at four times the captured-content bound, plus fixed header checks. The process accepts at most 256 commands, each burst has 32 transactions, and its 60-second lifetime stops gracefully after current work. No process is killed. The parent confirms exit before authenticated exact-layout cleanup; uncertainty blocks subsequent fixtures. Synthetic Windows DACL protection is still explicitly unqualified; private-data use requires the existing real protection/accounting/cleanup guarantees. No crash/power-loss recovery of this research harness is certified.

### Final observed rates and impact

Windows x64 agent sandbox, Node 24.18.1, SQLite 3.53.1. Each transaction updates both test tables together; an admitted candidate is then checked independently for structural integrity and generation equality. A candidate with mismatched generations counts as an undetected strategy failure even though the oracle reader itself refuses it. Counts are deliberately adversarial scenario results, not estimates of Desktop failure probability.

| Strategy | Classified attempts | Consistent candidates | Refused | Structurally invalid candidates | Undetected mixed candidates |
| --- | ---: | ---: | ---: | ---: | ---: |
| Raw baseline, forced checkpoint mixture | 1 | 0 | 0 | 0 | 1 |
| WAL-first with epoch/prefix checks, forced mixture | 1 | 0 | 0 | 0 | 1 |
| DB-first, strict entire-WAL validation | 43 | 20 (46.5%) | 23 (53.5%) | 0 | 0 |
| DB-first, published WAL-index endpoint | 37 | 30 (81.1%) | 7 (18.9%) | 0 | 0 |

In that historical sample, the published-endpoint variant yielded 16/16 consistent candidates during append-only concurrency. Checkpoints every four transactions yielded 11/16 consistent candidates and five refusals; a reused idle WAL and the controlled same-epoch checkpoint mixture succeeded. The other two refusals were deliberately reset/unpublished-epoch cases. All 30 admitted candidates passed both the structural and logical oracle checks in those cases. The sample omitted the stale-header prerequisite failure reproduced below; its zero count does not support a current correctness claim. Copied data remained explicitly non-atomic across JSON/index/SQLite and could be an earlier committed view.

| Strongest variant workload | Control writer p95 / max (ms) | Concurrent writer p95 / max (ms) | Copy p95 / max (ms) | Failed commits / busy checkpoints |
| --- | ---: | ---: | ---: | --- |
| Append-only, 32 commits | 1.074 / 1.699 | 1.028 / 1.173 | 87.133 / 87.133 | 0 / no checkpoints |
| Checkpoint every fourth commit, 32 commits | 1.596 / 2.264 | 1.484 / 1.563 | 74.744 / 74.744 | 0 / all eight reported zero |

Copy times include deliberate two-millisecond barriers at read-stage starts. Short sequential control/concurrent bursts are scheduling-sensitive and do not demonstrate a speedup or zero I/O cost. Writes remained operational in these cases; the consumer deliberately acquired no SQLite locks and requested no producer-write exclusion. Idle source SHM bytes were identical before/after the published-endpoint copy and copied-only analysis. Longer workloads, page/record layouts, alternate SQLite versions/filesystems and actual Desktop behavior remain unqualified.

### Validation, reconciled failures and stopping point

Final typecheck/build passed. The final gate passed **18/18**, with zero failures/skips, approximately 15 seconds; every fixture reported confirmed child exit and exact cleanup. The initial gate had three failed expectations because an identical-value seed update produced no useful WAL; changing the invented seed to different bytes and asserting timing-barrier reach corrected the fixture. A later expected-success assertion against an unpublished epoch was corrected to expect refusal; a separate committed-endpoint case proves exclusion of spilled uncommitted suffix frames. Neither adjustment loosened validation, and all those fixtures were cleaned. Missing/empty epochs, reset at DB/WAL/verification phases, producer close, WAL growth, checksum corruption and truncated frames are covered. No-opt-in execution skips without creating fixtures.

The four previous ordinary-suite failures were reassessed outside the restrictive agent sandbox under the authorized synthetic-only workflow, using only their exact name-filtered tests: **4 passed, 0 failed, 0 skipped**. The junction, hard-link, redirection and loopback cases all passed with their existing cleanup hooks. This confirms an environment limitation for the earlier failures, not a runtime regression; no existing test or runtime file was changed. This is not a new full-suite result and resolves no historical research/fixture uncertainty.

```powershell
npm run typecheck
npm run build
$env:WORKSPACE_SURVEYOR_RUN_BEST_EFFORT_GATE='1'
node --test dist/test/best-effort-gate.test.js
```

Stop this investigation here. Independent review found a P1 correctness blocker; production readiness is not established by the earlier passing sample or by best-effort labeling. Any future proposal must first establish the missing coherence and checkpoint-progress prerequisites; this correction authorizes no replacement algorithm or further research round. No source generation oracle, automatic retry, silent cached replacement, private execution or production integration is authorized. The five roadmap reconciliation edits and all earlier evidence/residual disclosures are preserved.

### Independent-review P1 reproduction and correction — 2026-10-15

**Reviewer finding, reproduced with deterministic fault injection:** the new focused regression captures a valid 96-byte SHM header and its committed WAL prefix after a payload-only seed transaction. While the database-first read is between the two test-table pages, the independent invented producer commits generation 1 and completes a PASSIVE checkpoint. Only the consumer's exact SHM-header read is then substituted with the previously valid bytes. The real source SHM is not modified, and its subsequently read header differs while retaining the same epoch salts.

The unchanged protocol returns `candidate`; the acquired WAL equals the earlier valid prefix, and copied SQLite integrity passes, but the table generations are **0 and 1**. The external oracle records **one undetected mixed candidate in one injected attempt**. The regression passes by asserting this known limitation; it is not evidence of a repaired protocol. Original non-injected sample counts above remain historical and separate rather than being silently rewritten into a new success rate.

**Evidence limit:** this demonstrates the consequence of an injected stale-read behavior permitted by the unresolved coherence assumption. It does not observe a Windows cache/coherence failure, measure its frequency, or establish that Codex Desktop encountered it. Microsoft's documented absence of a coherence guarantee is independent official evidence. Successful non-excluding byte copies, operational producer commits, cleanup results and timing measurements retain their original bounded meaning, but cannot validate relationship correctness or production readiness.

The test-only validator now carries an explicit known-limitation comment; its algorithm is unchanged. The correction changes only the focused regression, that comment and this research record. No production code, source/recovery contract or personal state is involved. Fresh independent review should verify reproduction and corrected claims, not treat this passing limitation test as authorization to integrate.

Correction validation: typecheck/build passed; the focused gate passed **19/19**, zero failures/skips, approximately 11 seconds, including the injected counterexample. All current-run fixtures reported confirmed producer exit and exact cleanup. The ordinary non-injected published-endpoint sample in this rerun had 34 candidates and three refusals in 37 attempts; the separate injected attempt still exposed one mixed candidate. These bounded results do not retire the P1 correctness prerequisite or supersede the historical measurements above. No historical live-research tests or personal operations were run.
