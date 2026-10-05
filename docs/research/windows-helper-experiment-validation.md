# M2a.3 minimal Windows helper experiment validation

## Authorization and provenance: design decision

The founder separately authorized this gate on **2026-10-05**: one test-only PowerShell 7 script using supported managed APIs, a Node coordinator/competing process, in-memory current-user SID use, ACL changes to exact owned synthetic objects, bounded invented copies, fault injection and exact-run cleanup. No production helper, native integration, dependency, compiler, P/Invoke, elevation, execution-policy change, alternate-account test, existing parent ACL inspection, Codex experiment or private source is authorized.

Implementation: [helper](../../test/support/windows-helper-experiment.ps1) and [Node tests](../../test/windows-helper-experiment.test.ts). Measurements are implementation validation on disposable synthetic objects, recorded under design decisions. They are neither founder-observed Codex evidence nor official contracts. Preserve [ADR 0008](../decisions/0008-synthetic-acquisition-kernel.md), [M2a.1](synthetic-acquisition-validation.md), [M2a.2](windows-acquisition-controls-validation.md) and WIN-001–WIN-020 independently.

| Contemporaneous context | Observation |
| --- | --- |
| Execution date | 2026-10-05, client Europe/Stockholm date |
| Baseline commit | `0e6aad743cea969c26dc816bb3461ebc3c12593f`; helper changes uncommitted |
| Node / libuv | 24.18.1 / 1.52.1 |
| Platform / architecture / Windows release | `win32` / `x64` / `10.0.26300`, built-in runtime observations |
| PowerShell / .NET | 7.6.5 / 10.0.11, helper runtime observations |
| Execution context | Initial restricted execution denied the root DACL update; its empty synthetic run cleaned successfully. Ordinary-account execution outside the agent sandbox permitted the update. No Windows elevation was requested or implemented |
| Filesystem / volume / alternate accounts | Unknown; no filesystem identification, parent ACL or alternate-account inspection |
| Codex versions, source locations, schema or behavior | Unknown; never inspected |

No recorded paths, account names, SIDs, SDDL, hashes, fixture contents or raw captures identify this machine's sources or temporary objects. Runtime observations do not backfill historical contexts.

## Mechanism selection: official documentation and design decisions

| Candidate | Assessment |
| --- | --- |
| Installed PowerShell 7 + managed .NET | Selected: supported descriptor creation/readback and FileStream sharing without compilation or dependencies |
| Standalone C# | Same controls with an added SDK/build/artifact requirement; unnecessary here |
| Native Win32 executable / P/Invoke | More direct native control, with compiler or marshaling/resource-management costs; reserved for a demonstrated managed gap |
| ACL command utilities | Cannot retain source handles throughout copying; mixing tools adds diagnostic and coordination complexity |
| Node addon / FFI | Build/dependency and integration architecture beyond this gate |

[DOC-012](evidence-catalog.md#doc-012-managed-windows-security-descriptors) records supported security-aware creation and descriptor readback. Creation APIs that silently accept existing directories cannot establish new ownership; this helper refuses existing child targets first. [DOC-013](evidence-catalog.md#doc-013-managed-read-sharing) records explicit managed sharing and [DOC-010](evidence-catalog.md#doc-010-windows-file-handle-sharing) supplies Windows compatibility/lifetime rules. [DOC-014](evidence-catalog.md#doc-014-bounded-test-host-invocation) documents the host invocation surface. Supported APIs do not turn these tests into an atomicity or hostile-race guarantee.

## Procedures and measured outcomes: implementation validation

Node creates a unique synthetic container and nonce marker outside the checkout. The helper accepts only that exact root, nonce and finite case identifier through stdin. Before any fixture content, it sets the owned root/marker descriptors. Every child is created with an explicit descriptor and independently verified. No existing parent descriptor is inspected or changed.

The selected policy grants only the current user's SID FullControl: protected, present non-null DACL; exactly one explicit allow ACE; current-user owner; no inherited/extra ACEs. Directories carry container/object inheritance flags with no propagation restriction; files have neither flag. The verifier checks actual freshly retrieved security descriptors, owner, control flags, ACE count, identity, type, rights and inheritance. Newly created file handles are verified before writing. Account/SID objects remain in helper memory; no name lookup or token/group dump occurs.

This establishes **descriptor configuration** against the selected policy on the tested objects. Effective denial to another account is **unverified**. Same-account processes, privileged takeover, the initial empty-container bootstrap interval and hostile replacement races are outside this claim. Parent security alone never substitutes for child verification; see [DOC-011](evidence-catalog.md#doc-011-windows-object-security-and-inheritance).

| Probe | Measured outcome | Conclusion / limit |
| --- | --- | --- |
| DACL establishment | Root, owner marker, source/scratch directories, two invented files and empty scratch probe passed actual descriptor readback | Selected descriptor configuration established on owned objects in this execution context |
| Extra-ACE refusal | An empty scratch file received an additional Everyone-read ACE; verification refused before acquisition reads/copies | Actual broader DACL rejected; file remained empty; cleanup performed no permission repair |
| Reader first | Helper retained Open/Read/FileShare.Read; Node read-open succeeded and write-open failed; released write-open and one fixed invented-byte write succeeded | Controlled cross-process deny-write observation, corroborated by explicit parameters and released control |
| Writer first | Node retained a write-capable handle; helper reported Windows sharing violation; Node closed the writer and explicitly requested the released control; the same helper opened the same file successfully | Both opening orders covered; released control is deliberate, not an automatic acquisition retry |
| Rename / unlink | Each operation failed on a separate fresh fixture while the helper read handle remained held; the corresponding operation succeeded after release | Controlled deny-delete/rename observation; no loops or replacement race |
| Retained-set copy | Both source streams were acquired before any read/destination creation, retained through two bounded copies and verification, and closed before cleanup | Exact invented bytes matched; destination descriptors verified; no atomic multi-file guarantee |
| Second-file writer | First read handle acquired; second read-open returned sharing violation; no scratch destinations created; all handles closed | Partial selected-set refusal with no acquisition bytes produced |
| Fault after protection | Allowlisted `after-protection` marker set after successful root/marker readback, with phase `marker-verify`, immediately before throwing and before fixture creation | Tests require this exact evidence; earlier/wrong-phase refusal cannot pass; sanitized refusal and exact cleanup, not blanket initialization-failure coverage |
| Fault during copy | Allowlisted `after-partial-write` marker and write boolean set only after the first bounded destination write, flush and length/position checks, with phase `copy`; Node independently verified the single destination's expected size/content after exit and before cleanup | Tests require both helper and destination evidence; failure before writing cannot pass; all handles disposed, partial destination removed and sources unchanged |
| Diagnostic canary | Allowlisted `diagnostic` marker set after injected stderr write/flush, with phase `marker-verify`; Node confirmed diagnostics were captured using a boolean only | Tests require the exact stage and capture evidence; raw diagnostics discarded, successful observations withheld and cleanup confirmed |
| Cleanup after deletion begins | Node recorded reaching the injected refusal immediately before child rmdir, after the file deletion loop | Tests require that injection marker as well as residual status, retained ownership and successful authenticated retry |

Source regression measurements compare bytes and file identity, size, modification/change timestamps before and after the retained-handle interval. Access-time behavior is not a zero-write claim. Deliberate released-control writes/rename/unlink occur afterward on these disposable control fixtures. No process-attributed tracing was performed. The diagnostic suite checks only specified injection stages; it does not test abrupt termination or every constructor/initialization failure.

The targeted review correction requires fault-stage evidence in addition to the expected refusal. Protocol regressions reject unknown evidence and the acceptance predicate rejects missing markers, wrong phases, missing partial-write/destination evidence and missing diagnostic-capture evidence. Evidence consists only of fixed allowlisted stages and booleans; no paths, raw errors, contents, account identifiers, stacks or canaries are emitted. These assertions strengthen existing cases without adding another experiment.

An early refusal before the prepared handshake has no Node source baseline: its `unchanged` boolean is false (unmeasured), not evidence of mutation. A refusal withholds successful protection/copy observations. The cleanup-fault case reports its initial residual status together with a separately asserted successful exact-run retry; no residual remains at completion.

## Bounds, diagnostics and cleanup: design decisions

Each run uses at most eight files, four directories, 4 KiB per file and 32 KiB total content including the marker. Source/destination basenames are fixed. Node checks root identity, nonce, resolved containment, links, hard-link count and bounded entries; the helper checks its exact temporary-child scope, marker, reparse attributes and file bounds. No broader temporary-storage scan is performed. These checks do not prevent hostile namespace races.

The test explicitly opts in through `WORKSPACE_SURVEYOR_RUN_HELPER_EXPERIMENT=1` and selects the installed executable through `WORKSPACE_SURVEYOR_HELPER_PWSH` in the process environment. Node invokes it without a shell, hides its window and passes `-NoLogo -NoProfile -NonInteractive -File`. Source roots/nonces travel through stdin, not command arguments. No executable path is stored in repository documentation.

The finite test-local protocol reports prepared, sharing-refused (writer control only), handles-held and finished stages. It emits only allowlisted versions, stages, categories and booleans. The helper rejects protocol input beyond its 8 KiB acceptance limit. Node accepts/parses stdout only while the cumulative received-byte count is at most 8 KiB, then requests cooperative cancellation and discards further chunks; its accumulated parser buffer/accepted output is bounded by that limit. Stderr chunks are discarded without retaining their text, and any stderr withholds results. These application acceptance/buffering limits exclude transient delivered chunks and runtime/OS pipe buffers: **total stdout/stderr bytes transported or drained are not capped at 8 KiB**. The pipes can continue delivering discarded output until helper exit or the existing grace-period handling. Malformed/additional/oversized frames also withhold results. No transport redesign was made. Recognized sharing HRESULT `0x80070020` is classified separately from access, unsupported API and other errors. No raw messages/stacks escape helper catches.

Use a 30-second cooperative deadline. EOF/cancellation/error paths dispose streams in `finally`. Node waits for helper exit/closed status before cleanup; unconfirmed exit after its grace interval stops further cases and reports residuals without deleting or killing. Blocking OS calls, orphan handling and abrupt termination remain unproven. Cleanup first authenticates all known entries, retains the marker through child deletion, and deletes only the owning run. No recursive sweep, source restoration, ACL loosening or secure-erasure promise exists.

Ordinary `npm test` skips the 12 empirical helper cases, including on Windows, until explicitly opted in. The two protocol/scope tests still run. Skips never count as helper validation. For an authorized run, set the two process-local variables and run `npm test`; package scripts and dependencies remain unchanged. Execution context must permit the approved DACL operations; sandbox denial remains a refusal, never a signal to silently bypass protection.

## Validation and stopping point: design decision

Typecheck, build, full tests, documentation/privacy/scope checks and diff review are recorded in [compatibility](../compatibility.md#m2a3-minimal-windows-helper-experiment). Independent review is still required before proposing integration.

Native acquisition remains `protection-unverified`; no kernel, fixture builder, CLI, production imports, package/lockfile/scripts, goldens, historical ADR or M2a.1/M2a.2 validation record changed. No real-state access, disposable Codex, dependency installation, staging, commit or push occurred.

**Unknown after these measurements:** effective other-account access, ancestor-directory security, hostile races, atomic database/WAL/SHM acquisition, new/absent companions, mapped writers, other filesystems, process-attributed zero transient writes, abrupt-termination cleanup, secure erasure and all Codex behavior. These controls close the narrow managed-API questions for the tested context; they do not certify real acquisition. A reviewed result may inform a separately authorized synthetic integration proposal. No subsequent gate is authorized automatically.
