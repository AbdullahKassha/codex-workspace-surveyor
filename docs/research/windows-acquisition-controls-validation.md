# M2a.2 Windows acquisition controls validation

## Authorization and provenance: design decision

The founder separately authorized this gate on **2026-10-05**: supported Node APIs, disposable synthetic files, one test-only module, bounded Windows probes, supporting documentation and exact-run cleanup. The authorization excludes helpers, undocumented numeric flags, competing subprocesses/workers, SQLite probes, parent ACL inspection, alternate-account tests, private sources and disposable Codex. Stop at M2a.2; capability gaps are an acceptable completion result.

The implementation is [the Windows probe suite](../../test/windows-acquisition-controls.test.ts). These are measurements of ordinary Windows filesystem behavior on newly invented bytes, recorded as implementation validation under design decisions. They are not founder-reported Codex observations, do not receive WIN IDs and do not certify Codex acquisition. [ADR 0008](../decisions/0008-synthetic-acquisition-kernel.md) and the [M2a.1 record](synthetic-acquisition-validation.md) remain historical and unchanged.

| Contemporaneous context | Observation |
| --- | --- |
| Execution date | 2026-10-05, client Europe/Stockholm date |
| Baseline commit | `2e51e45aea78839a98745add4b3d3a5d6a4a4787`; probe changes were uncommitted during validation |
| Node / bundled libuv | 24.18.1 / 1.52.1, from `process.versions` |
| Platform / architecture | `win32` / `x64` |
| Windows release | `10.0.26300`, from `node:os.release()`; contemporaneous context only |
| Filesystem type / volume properties | Unknown; no filesystem identification, parent ACL, volume or synchronization inspection |
| Account / security descriptors | Unknown; no usernames, SIDs, tokens, account configuration or ACLs inspected |
| Codex build, state locations, sources or schemas | Unknown; not inspected |

The running Node patch and libuv version match the official release source reviewed before probes ran: [DOC-009](evidence-catalog.md#doc-009-node-and-bundled-libuv-sharing-boundary). This context never backfills B0, B1 or M2a.1. Repository records contain no actual temporary paths, identities, file hashes, fixture contents or raw diagnostic captures.

## Questions and evidence thresholds: design decisions

1. Can supported Node APIs establish and verify restrictive scratch DACLs on the root and every child? **Demonstrated API gap; actual scratch protection remains unverified.** [DOC-008](evidence-catalog.md#doc-008-node-windows-filesystem-limitations) supplies the Windows mode/access limitations. A successful mode call or current-process access check does not inspect a security descriptor.
2. Can these APIs distinguish protection from inheritance, mode bits, owner access or an owner marker? **Unverified by the probes and unavailable through the reviewed API surface.** No ACL or alternate-account observation occurred. A marker authenticates cleanup bookkeeping, not access control.
3. Does the current ordinary read-open exclude existing/subsequent writers and namespace operations? **Demonstrated gap.** Both handle orders admitted verified byte updates; rename and unlink succeeded while read handles remained open.
4. Which guarantees have which provenance? **Established within narrow bounds:** exclusive creation refused an existing file; measured bytes were visible through retained handles; exact probe cleanup succeeded. Official Windows sharing rules are recorded separately in [DOC-010](evidence-catalog.md#doc-010-windows-file-handle-sharing). No exclusion, DACL, atomicity or zero-write guarantee follows from these observations.
5. What needs another mechanism and approval? Establishing and inspecting security descriptors/effective protection, and requesting supported deny-write/delete sharing with a continuously retained handle set. The bounded subsequent proposal appears below; no mechanism is implemented or selected.

The minimum proposed future scratch policy protects contents against unrelated unprivileged accounts. Isolation from the same account, administrators or SYSTEM is outside that policy. Positive evidence would require a supported means to establish and inspect each object's actual descriptor, inheritance and effective rights under this explicit policy. A private-looking name, drive letter, POSIX mode, `fs.access()`, marker or successful caller access is insufficient. Child-object protection must be verified as well as the root; see [DOC-011](evidence-catalog.md#doc-011-windows-object-security-and-inheritance).

One successful competing write disproves writer exclusion for that opening method. Rename/unlink success disproves the corresponding restriction. A failed attempt alone is inconclusive because ordinary permissions or environmental interference may explain it. Positive observations could not enable acquisition in this gate; both controls would require independent review and separately approved integration.

## Procedures and observations: implementation validation on synthetic inputs

Probes execute synchronously and sequentially in one process, with fresh invented files for each case. Two handles suffice for counterexamples because Windows sharing applies regardless of process context (DOC-010). No timing loops, actual concurrent processes, replacement races, SQLite, database companions or real writers are involved.

| Probe | Procedure | Observed on this environment | Conclusion |
| --- | --- | --- | --- |
| A: modes/access | Create a directory requesting `0700` and file requesting `0600`; observe mode/access; apply `chmod(0600)`, then `chmod(0644)` | Each snapshot reported directory/file permission bits `0666` (438 decimal); both current-process R_OK/W_OK checks succeeded | Node mode/access observations did not establish or inspect a DACL; actual protection unknown |
| B: reader first | Retain `'r'`; open `'r+'`; write one fixed-length invented update | Second open succeeded; retained reader returned the updated bytes | Ordinary read-open did not exclude a subsequently opened writer |
| C: writer first | Retain `'r+'`; open `'r'`; update through retained writer | Reader open succeeded; reader returned updated bytes | Ordinary read-open did not reject the already-open writer |
| D: rename/unlink | On two independent fixtures, retain read handles during one rename or unlink attempt | Rename succeeded, old name absent and new name present; unlink succeeded and name absent; both retained handles still read expected bytes; deleted name remained absent after close | Ordinary read-open prevented neither operation |
| E: exclusive creation | Retain original `'wx'`; attempt another `'wx'`, then `'r+'` and a fixed-length update | Second creation returned the allowlisted `exists` result; writer open succeeded and a reader verified updated bytes | Exclusive creation is not exclusive handle sharing |

All five probes returned allowlisted observations with cleanup `removed`. Denied operations would be recorded as inconclusive, not proof of a protective sharing mode; unknown errors stop the affected probe and withhold observations. Byte mismatch or inconsistent known-name transitions also stop it.

**Official-source review / inference boundary:** DOC-009 records that the ordinary bundled Windows open path requests read/write/delete sharing. Its internal exclusive-sharing branch is not an exposed supported Node constant and was not executed via a numeric value. The public `UV_FS_O_FILEMAP` flag concerns mapped I/O; the inspected implementation selects ordinary sharing before mapping creation. That source inspection does not provide a caller-selected deny-write/delete contract. Memory mapping was not tested or adopted. Cache/synchronous-I/O flags are not substituted for sharing controls.

The M2a.1 kernel additionally opens/closes individual measurement and copy reads; it does not maintain exclusion over an entire acquisition interval. These probes supply no continuously protected database/companion set. No kernel code, native refusal, fixtures, CLI, package scripts, dependencies or goldens changed.

## Safety, cleanup and checks: design decisions and implementation validation

Each run creates one unique synthetic root outside the checkout and one fixture child directory, rejecting checkout overlap or a `.codex` path component. Root identity, resolved containment, unexpected links, file hard links and owner tokens are checked. This bounded location check is not effective Codex-home discovery. Actual ACL protection is unknown; only invented bytes are permitted here.

Limits include the owner marker: eight files, four directories, 4 KiB per file and 32 KiB total file content per run. Fixed names bound creation and cleanup. All descriptors are tracked and closed before deleting artifacts; close failure retains residual status and refuses deletion. Cleanup authenticates all entries before deleting any, keeps the marker through child removal, and permits final-root retry only for the same authenticated empty root. It never recursively removes directories or enumerates broader temporary storage.

By design, the wrapper catches initialization and operation errors and withholds observations on failure, scope escape, privacy failure or residual cleanup. The diagnostic regression below exercises an error after successful initialization; it does not establish initialization-failure or partial-initialization coverage. Output is limited to allowlisted operation outcomes, permission numbers and booleans, plus non-identifying built-in context. Raw errors, paths, stacks, canaries and account identifiers are withheld. Unexpected results require review, not automatic retries or source restoration.

Focused regressions cover sanitization of an error injected after successful initialization and its captured stdout/stderr diagnostics, an injected output canary, oversized content refusal, residual reporting after deletion begins, authenticated cleanup retry, and unknown-entry refusal with an unrelated owned synthetic sentinel surviving. The deliberately injected residual is removed by its exact owning run after the fault is disabled. There is no crash-cleanup or secure-erasure claim.

Validation commands are `npm run typecheck`, `npm run build`, and `npm test`. Non-Windows runs explicitly skip empirical cases and cannot be counted as Windows validation. Final test count and documentation/privacy/scope checks are recorded in [compatibility](../compatibility.md#m2a2-windows-acquisition-controls-validation).

## Subsequent helper experiment proposal: not authorized

**Demonstrated capability gap:** supported Node mode/access APIs do not establish or verify the required scratch descriptors, and ordinary source read-opens admitted writers and namespace changes. Native acquisition remains `protection-unverified` and no findings are enabled.

A separately approved, disposable synthetic helper experiment could address only:

- Establishing a restricted scratch root before sensitive content could be written, inspecting root/child security descriptors and inheritance, and checking them against an explicitly approved principal policy. Account/SID information needed for enforcement must remain in memory and out of reports.
- Opening only fixed test-owned files for existing-file read access with explicit read sharing while denying write/delete sharing. Test both handle orders and conflicting writes/rename/unlink while handles remain held; distinguish sharing failures from ordinary access failures.
- Holding the authenticated handles for the whole bounded read/copy interval, then closing them before exact-run cleanup. No source-writing open, ACL change on designated sources, SQLite source open or recovery operation would be permitted.

That proposal must name the helper mechanism before approval, its synthetic targets, ownership/identity checks, principal policy, limits, handle lifetime, sanitized diagnostics and cleanup/residual behavior. It would retain the same small synthetic bounds and require no Codex or personal inputs. It would not authorize production helper architecture or real acquisition. Cross-process tests, alternate-account access tests or subprocess permissions require an explicit scope in that subsequent approval, not an implied extension of this gate.

**Unknown after this gate:** effective scratch DACLs, atomic database/WAL/SHM acquisition, absent-companion creation, hostile races, mapped writers, cross-process enforcement, process-attributed zero transient writes, abrupt-termination cleanup, secure erasure, other filesystems, and every Codex source/schema/lifecycle behavior. Helpers, disposable Codex validation, personal canaries, M2b/M2c, Git/worktree mapping, commits and publication remain separately gated.
