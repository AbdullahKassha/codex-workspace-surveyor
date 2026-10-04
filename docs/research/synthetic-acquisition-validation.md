# M2a.1 synthetic acquisition validation

## Context and claim categories

**Design decision / synthetic implementation validation:** the founder authorized the narrowed kernel on 2026-10-04 under [ADR 0008](../decisions/0008-synthetic-acquisition-kernel.md). Results below concern newly constructed invented files, not a founder-observed Codex experiment. No WIN ID is added or retired; B0/B1 remain unchanged.

| Context | Value |
| --- | --- |
| Validation date | 2026-10-04 |
| Platform | Native Windows test execution |
| Node / npm | 24.18.1 / 11.16.0 |
| Embedded SQLite | 3.53.1, measured using an in-memory database |
| TypeScript / Node typings | 7.0.2 / 24.19.1, existing lockfile |
| Windows build / filesystem type | Unknown; not inspected or certified |
| Desktop / agent versions / real schemas | Unknown; no private-state inspection |
| Scratch data | Invented fixtures only, per-run operating-system temporary directory |
| ACL / Windows sharing validation | Not established; native acquisition refuses |

Run `npm run typecheck` and `npm test` with existing dependencies. Tests build first. No installation or separate runtime script is required. The synthetic CLI and its three text goldens remain unchanged. No source paths, temporary directory names, file hashes, raw rows or audit reports are stored in the repository.

## Implemented mechanics: design decisions

The internal harness creates builder, source and scratch areas under one unique temporary run root. It rejects a temporary location overlapping the working checkout or containing a `.codex` component before creating artifacts. This bounded location check is not effective Codex-home discovery: custom Codex roots and synchronization settings remain unknown. No real input is supported.

SQLite constructs two invented databases in the builder area. One has an extra committed row in WAL; it is raw-copied with its companions while the invented builder connection is idle, before closing the builder connection. This constructs fixture bytes only; it does not validate live acquisition. JSON contains an invented project/root and a private-field canary. Designated sources are never opened by SQLite.

Explicit selections are the logical names `standalone.sqlite`, `wal.sqlite` and `metadata.json`, not arbitrary paths. Acquisition reads only those files and exact existing companions. Limits are 128 KiB per file, 256 KiB per acquisition and five files. A fixed-size read buffer with one overflow byte bounds reads even if a represented input grows. Unsupported companion combinations and any rollback journal refuse; no recovery is attempted.

Before/after measurements retain file identity, byte size, modification/change times and SHA-256 hashes in memory. Access time is excluded because raw reading may cause incidental OS metadata changes. The acquired bytes must match; mismatched sets or observations withhold findings. No atomic snapshot, lock exclusion or transient-write detection is established.

The analysis area gets distinct raw copies. SQLite uses read-only analysis connections, disabled extensions, defensive settings, untrusted-schema/query-only controls, fixed ordinary-table queries and bounded invented expectations. JSON analysis validates invented keys; canaries are never selected for output. Even read-only SQLite may affect analysis companions; designated sources and untouched acquisition bytes are checked again afterward.

## Protection and failure results

**Official documentation:** [DOC-008](evidence-catalog.md#doc-008-node-windows-filesystem-limitations) describes Windows filesystem limitations. Mode arguments and `fs.access()` cannot establish the required Windows ACL protection. The documented open flags do not supply the proposed sharing control.

**Design decision:** default `native` acquisition refuses with `protection-unverified` before source copying. The only successful branch explicitly injects `simulated-owner-restricted` protection. Every outcome carries `synthetic: true` and the selected protection mode. These successful tests cover actual raw copying of invented bytes under a simulated prerequisite; they do not prove owner-restricted Windows scratch.

Refusals return fixed reason codes and zero findings. They do not echo inputs, paths, hashes, row values, raw errors or stacks. Cleanup is independently `removed` or `residual`, so successful copying cannot conceal cleanup failure. The wrapper cleans on success and handled refusal, including constructor failure reporting. Initialization exceptions have fixed messages, no raw cause and no stack locations; failure before establishing root identity conservatively reports residual status and cannot authorize deleting that root. Tests retaining a run for inspection register exact-run cleanup afterward.

Cleanup first checks root identity, an owner token, resolved containment, links and all entries against the fixed fixture layout. It then unlinks non-owner files and removes child directories, retaining and checking the owner marker through that phase. The marker is removed only before final empty-root removal. A final root-removal failure retains authenticated in-memory identity; a retry can remove only that same empty root and refuses any new contents. Unknown entries and redirection refuse before deletion. No recursive removal or temporary-root enumeration occurs. Retrying an injected failure is allowed only for the same known synthetic run. There is no abrupt-termination recovery or secure-erasure claim.

## Validation results and limits

**Synthetic implementation validation:** 41/41 tests passed (22 original M1 tests and 19 kernel tests), alongside typecheck/build. Tests exercise standalone/JSON/WAL committed data, unmodified source bytes and relevant metadata, scratch-only writes, separate analysis mutation, explicit selection, overlap directions, synthetic junction/hard-link refusal, unsupported companions, all three limits, injected same-length changes, companion-set changes, represented read/copy failure, exclusive-write collision after partial copying, malformed analysis, invented schema drift, acquisition tampering, exact cleanup, residual reporting and privacy canaries. A separate synthetic run serves as a sentinel against unrelated deletion.

The final check count and documentation review are recorded in [compatibility](../compatibility.md#m2a1-synthetic-kernel-validation). Static import checks supplement manual review; they are regression checks, not a sandbox or process tracing.

**Review corrections — 2026-10-04 (synthetic implementation validation):** the founder supplied four independent-review findings concerning initialization error handling, cleanup ordering, WAL dependence and diagnostic privacy. The fixes remain within ADR 0008. Five added tests bring the full suite to **46/46 passed** (22 original M1 tests and 24 kernel tests). An injected root-identity `lstat` failure is covered for direct construction and wrapper invocation; its raw canary/path/cause is withheld from exceptions and captured stdout/stderr. The kernel reports an unauthenticated residual root without deleting it; only the owning test independently verifies and removes its exact empty artifact afterward. Deletion-phase faults verify owner-marker retention through child-directory removal and safe retry of final empty-root removal, including refusal to delete newly introduced contents. A separate analysis copy made from untouched acquisition bytes contains the base row but lacks the WAL-dependent committed row when WAL/SHM are omitted. No fixture redesign, source SQLite open or checkpointing was introduced. The original 41-test checkpoint is retained above as implementation history.

**Unknown:** restrictive Windows ACLs, deny-write/delete sharing, active writers, hostile redirection races, crash persistence, disk exhaustion, OS/process-attributed zero-write evidence, actual filesystem support, real sources, Codex versions, source semantics and real schema compatibility. No native or personal acquisition is enabled. A future helper needs separate scoped approval, including the specific ACL/sharing observations or operations and test-owned targets; no implementation is pre-authorized by this record.

Full copies can contain unselected sensitive material. Later private consent must explicitly cover full database/companion or JSON acquisition as well as selected metadata, scratch location, retention and cleanup. Before personal access, separately validate closed-app acquisition in an isolated disposable Codex environment. Execute eventual personal acquisition independently after all relevant Codex writers have closed. Retain disagreements and partial coverage without inventing projectlessness, deletion or a clean audit.
