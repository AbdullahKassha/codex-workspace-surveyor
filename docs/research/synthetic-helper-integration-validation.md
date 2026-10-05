# M2a.4 synthetic helper integration validation

## Authorization and evidence category: design decision

The founder separately approved this synthetic integration after the independent M2a.3 re-review passed. This gate changes only test support, tests and supporting guidance. It does not enable native acquisition, introduce a production/public helper interface or authorize discovery, disposable Codex, personal files, M2b/M2c, dependency installation, staging, commits or publication. Preserve [ADR 0008](../decisions/0008-synthetic-acquisition-kernel.md), [M2a.1](synthetic-acquisition-validation.md), [M2a.2](windows-acquisition-controls-validation.md), [M2a.3](windows-helper-experiment-validation.md) and WIN-001–WIN-020.

This record is **implementation validation on invented inputs**, separately attributed from official contracts and founder-observed Codex experiments. Synthetic results never certify a Codex schema or lifecycle. The CLI remains the M1 bundled demonstration.

| Contemporaneous context | Observation |
| --- | --- |
| Execution date | 2026-10-05, client Europe/Stockholm date |
| Baseline commit | `13b49dca09517140efaf289ef08e320db4adbbe3`; integration changes uncommitted |
| Node / libuv | 24.18.1 / 1.52.1 |
| Platform / architecture / Windows release | `win32` / `x64` / `10.0.26300`, built-in runtime observations |
| PowerShell / .NET | 7.6.5 / 10.0.11, helper frame observations |
| Execution context | Approved ordinary-account execution outside agent sandbox for owned-object DACL operations; no Windows elevation or execution-policy changes |
| Filesystem / parent descriptors / other accounts | Unknown; not inspected |
| Codex versions, sources, schemas or behavior | Unknown; never inspected |

## Integration boundary and sequence: design decisions

The synchronous kernel's native and simulated paths are preserved. The separate asynchronous coordinator requires Windows, `WORKSPACE_SURVEYOR_RUN_HELPER_INTEGRATION=1` and an explicitly selected installed `pwsh.exe` through `WORKSPACE_SURVEYOR_HELPER_PWSH`. It uses the distinct `windows-helper-synthetic` label; selecting that label alone does not enable copying in the synchronous path. The helper's existing M2a.3 cases retain their earlier behavior and limits.

Node creates/authenticates the unique run container and nonce marker outside the checkout, then starts the fixed test script without a shell, profile, visible window, elevation or policy bypass. The helper accepts only the owned initially empty container, nonce and finite integration case/fault. It protects the root/marker and creates fixed builder, source, scratch, acquisition and analysis directories with fresh descriptor readback. It never inspects existing parent ACLs.

Node runs the unchanged fixture builder in the builder area, closes its SQLite connections, then designates the separate raw source files. Sources are fixed fixture basenames with recognized existing companions; arbitrary paths cannot be registered. SQLite receives builder or analysis paths only. No source SQL, repairs, checkpoints, vacuum, immutable workaround or designated-source ACL changes are introduced.

Node measures the exact selected set, file identity, size, modification/change times and hashes. Names, sizes and digests travel only in private bounded stdin; they are not outcome fields. The helper independently derives the selected companion set, validates the manifest and opens **all** source streams with Open/Read/FileShare.Read before any copy. A later sharing failure closes earlier streams and produces no destinations. Retained stream length/hash checks corroborate the manifest; Node rechecks path identity/set/stability before authorizing copying.

The helper copies bounded bytes exclusively through those retained streams into separately created protected acquisition and analysis files. Each destination's actual descriptor is read before bytes are written, then flushed bytes are verified. Node supplies no acquisition data and logs no acquisition writes. The helper reports copies verified while all selected source handles remain held.

Node verifies both copies, analyzes only analysis paths, checks untouched acquisition identity/bytes, and repeats source-set/identity/time/hash checks. The helper repeats retained-source and acquisition digest checks and verifies all protected scratch descriptors and exact analysis/acquisition entries. Analysis may change its own bytes; recreated, missing, additional or incorrectly protected objects refuse. Sources remain held through final verification, then the explicit release closes handles. Node requires verified disposal and helper exit and cleans the exact owned run before returning success. No automatic acquisition retry or simulated-protection fallback exists.

Supported managed descriptor and sharing contracts remain [DOC-012](evidence-catalog.md#doc-012-managed-windows-security-descriptors), [DOC-013](evidence-catalog.md#doc-013-managed-read-sharing), [DOC-010](evidence-catalog.md#doc-010-windows-file-handle-sharing) and [DOC-014](evidence-catalog.md#doc-014-bounded-test-host-invocation). These contracts do not certify the flow's hostile-race safety or database atomicity.

## Bounds, protection and privacy: design decisions

Integration limits are 128 KiB per file, 256 KiB total/five selected files, and 21 files, six directories including root and 1 MiB content across the run, including owner, builder, sources, acquisition and analysis. Node checks known entries and reserves space for both copies before acquisition; it rechecks run bounds during verification and before cleanup. Earlier helper probes retain eight files/four directories/4 KiB per file/32 KiB total. There is no volume-space discovery or full-disk simulation.

Protected objects require current-user ownership, a present non-null protected DACL and exactly one explicit current-user FullControl allow rule. Directories carry object/container inheritance with no propagation restriction; files carry neither inheritance flag. Root, marker, fixed directories and every acquisition/analysis file receive independent actual descriptor readback. Builder-created raw fixtures remain the unchanged builder's synthetic objects; they are not evidence of independently protected scratch-file creation. SID objects stay in helper memory, with no account lookup, group enumeration, SDDL or identity output. The claim is descriptor configuration, not measured alternate-account effective access, same-account isolation or protection against privileged takeover.

Finite private handshake stages are protected-ready, handles-held, copies-verified, verified-held, release and finished. Frames correlate the private nonce, fixed stage order and selected counts. Exact schemas reject wrong runs, unknown/additional fields, duplicates and malformed values; public outcomes include only fixed categories, counts, versions and booleans. Input and accepted/buffered output are limited to 8 KiB. Additional stdout is discarded and drained; any stderr causes refusal without buffering or forwarding its contents. **Total bytes transported/drained by subprocess pipes are not capped at 8 KiB.** The cooperative deadline is 30 seconds with a 10-second exit grace, not a forced-termination guarantee. No process killing is implemented.

Captured diagnostics and exceptions are never reflected. Canary-bearing injected helper stderr is suppressed. Sanitized constructor failures report possible residuals when root identity was never established. Before/after hashes and operation boundaries remain regression evidence, not process-attributed proof of zero transient source writes; incidental OS access metadata is not equated with an intentional application write.

## Measured cases: implementation validation on synthetic inputs

| Case | Observation and sufficient evidence | Limit |
| --- | --- | --- |
| Standalone / JSON / WAL set / combined set | Each reached all four ordered handshake stages, verified descriptors and copies, passed fixed analysis and exact cleanup; combined selection copied five source files | These invented schemas are not real contracts |
| WAL-dependent row | Analysis contained two expected committed rows including the WAL-only row; acquisition SHM remained unchanged. The preserved M2a.1 no-WAL counterexample also passed in the full suite | No checkpointing or fixture redesign; no live WAL atomicity claim |
| Retained sharing | Compatible reader succeeded; write, rename and unlink failed at held, copies-verified and verified-held stages. Released write-open, rename and unlink controls succeeded | Only controlled Node/helper processes and these files |
| Later companion writer | A retained Node writer on SHM caused recognized sharing refusal after two source handles opened; both destinations were empty and earlier handle was released | No copy from a partial set; no retry |
| Whole-run reservation | Seventeen owned files remained within the run cap, but six proposed copies would exceed twenty-one; the pre-copy recheck refused at handles-held with both destination areas empty | Both file count and bytes are reserved before acquisition and rechecked immediately before copying |
| Pre-lock mutation / new companion / measurement exception | Each injected hook was reached after baseline; no copy destinations appeared; acquisition refused | Deterministic controls, not races or transient-write tracing |
| Root descriptor mismatch | Extra allow ACE refused with protected/root-descriptor evidence before fixture construction | No automatic permission repair |
| Empty destination mismatch | Extra ACE refused with copy/destination-descriptor evidence; independent destination size was zero | No bytes written to the mismatched object |
| Post-analysis descriptor mismatch | Actual analysis file received an extra ACE; final verifier refused with verify/analysis-descriptor evidence | Demonstrates withholding after a changed descriptor |
| Protection exception | protected/after-protection evidence required; fixtures absent | This is a post-protection fault, not initialization coverage |
| Partial copy exception | copy/after-partial-write plus write boolean required; Node independently verified a 16-byte matching prefix in the first destination and empty analysis directory | Only represented partial-copy failure |
| Captured diagnostic exception | verify/diagnostic evidence and captured-diagnostic boolean required; no raw stderr escaped | Sanitized reporting, not a total transport cap |
| Analysis separation | Deliberate post-analysis byte change left acquisition unchanged and passed; acquisition mutation separately refused | Acquisition copy never used for SQLite |
| Protocol / EOF / unavailable selection | Malformed/oversized frames, a valid-schema duplicate stage and represented EOF refused and cleaned; inconsistent final counts/copy/release evidence refused; missing host selection and unsupported source selection refused before creation | No forced crashes, killed processes or real orphan test |
| Initialization lstat fault | Independent test observed the root-identity lstat injection; wrapper emitted only refusal/residual, with sanitized captured caller diagnostics; test independently authenticated and removed the exact empty root | Unlike post-protection injection, this covers the constructor failure; no generic orphan cleanup |
| Exit uncertainty | Simulated uncertainty withheld success and deferred cleanup; test had separately observed actual helper exit before authenticated removal | Does not validate a genuinely unconfirmed/orphaned helper |
| Cleanup after deletion began | Child-directory fault preserved owner marker and residual status; same run retried safely; unrelated synthetic sentinel survived | No sweeping storage, ACL loosening, crash cleanup or secure erasure |

Fault tests require exact phases and allowlisted evidence; refusal alone cannot pass. Negative-case filesystem observations are asserted outside the coordinator's sanitizing error boundary so an assertion failure cannot masquerade as the expected refusal.

## Cleanup and stops: design decisions

Node is the sole cleanup owner. It confirms helper exit/disposal before walking only known entries under the exact run identity. It verifies all entries before deletion, retains the marker through child deletion and removes it only before final empty-root removal. Same in-memory authenticated retry is supported; there is no broad temporary search or deletion. A descriptor refusal does not trigger repair; current-user rights already present permit cleanup without ACL changes.

Unknown identity, links/redirection, unsupported companion set, limits, source instability, descriptor mismatch, protocol/host failures and cleanup uncertainty withhold all acquired findings/files. Unconfirmed helper exit/closure stops further coordinator runs and leaves residuals; no automatic killing or cleanup occurs. Actual experiments ended with confirmed exit and every exact artifact removed, including deliberately reported residuals removed only by the independently authenticated test recovery. There is no promise of cleanup after abrupt termination or secure erasure.

## Completion and remaining unknowns

Typecheck and build passed. The explicit Windows run enabled both the preserved helper probes and the new integration: **107 passed, zero skipped, zero failed**, comprising the existing 72 tests plus 35 new tests. The ordinary opt-out run passed **64 with 43 skipped and zero failed**; empirical skips are not Windows validation. Targeted protection, descriptor, partial-write, diagnostic, initialization and duplicate-stage tests also passed. A separate allowlisted context observation confirmed the runtime versions above and removed its exact synthetic run.

Documentation review passed for **299 relative links/anchors across 32 documents**, all 20 WIN anchors, category/official-source attribution and synthetic-only scope. Privacy/scope review covered all **10 proposed files**, with no identifying paths, private/scratch artifacts or unexpected files. `git diff --check` passed. Historical ADRs and validation records, fixture builder, production sources, CLI, package/lockfile/scripts and goldens remain unchanged. Nothing is staged, committed or pushed by this gate.

Delivered files are the modified test-only kernel and helper, new `test/support/windows-helper-integration.ts` coordinator, new `test/windows-helper-integration.test.ts`, this validation record, and updated AGENTS, roadmap, compatibility, evidence catalog and documentation index. Independent review remains pending before a next-gate proposal.

**Unknown:** hostile path/namespace races and native handle identity, atomic database/WAL/SHM acquisition, newly appearing/absent companions during acquisition, mapped writers, effective other-account access, parent security, other filesystems, process-attributed zero writes, real process failure/orphans, abrupt termination, secure erasure and all Codex behavior. SQLite effects on unfamiliar analysis copies remain unsupported until separately validated. Multi-file retained handles do not imply an atomic snapshot.

The implemented synthetic path is ready for independent review. A reviewed success could justify a separately authorized disposable-Codex proposal identifying exact sources, operations, version/schema evidence and closed-app baseline; it would not authorize execution, private sources, M2b/M2c or production integration.
