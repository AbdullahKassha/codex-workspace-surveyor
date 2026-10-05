# Disposable Codex isolation feasibility

## Authorization, provenance and result

**Design decision — 2026-10-05:** the founder approved implementation of the isolation-feasibility slice only: targeted read-only host checks, official research and this documentation. CLI-created state is the later first target. Environment creation, Codex execution, acquisition, code changes and Desktop validation are excluded. Preserve [ADR 0008](../decisions/0008-synthetic-acquisition-kernel.md) and the [M2a.1](synthetic-acquisition-validation.md), [M2a.2](windows-acquisition-controls-validation.md), [M2a.3](windows-helper-experiment-validation.md) and [M2a.4](synthetic-helper-integration-validation.md) records.

**Result: readiness gap; no installed, supported isolation mechanism established by the bounded checks.** No environment or installation is selected for execution. A fresh Windows VM remains the preferred conditional candidate. Setup requires a new scoped proposal and approval. This completes the feasibility slice through its permitted gap outcome; it does not validate isolation or real acquisition.

Repository baseline was clean `5f51ad8f598c0de93743fe86e7ff3aa6112eb1db`, after founder-reported independent M2a.4 review and commit. Historical M2a.4 results are 107 passes/zero skips with explicit opt-in and 64 passes/43 skips ordinarily. They are synthetic evidence, not results of this feasibility investigation.

**Provenance convention:** the following dated host observations are agent-executed, read-only feasibility measurements. They are neither founder-reported Codex experiments nor official contracts. No WIN identifier is added, reproduced or retired, and no B0/B1 version gap is filled.

## Bounded host observations

Only the following targets were queried. Errors from optional hardware queries were reduced to `unavailable`; no raw errors, paths, machine names or account identifiers were retained. No candidate executable was launched.

| Target / method | Observed 2026-10-05 | Limit |
| --- | --- | --- |
| Windows CurrentVersion registry `EditionID` only | `Core` | Edition observation, not a feature or licensing entitlement audit |
| Exact Windows System32 `WindowsSandbox.exe` existence | Absent | No Sandbox launch or enablement attempted |
| `VBoxManage.exe`: application-only PATH lookup and exact Oracle VirtualBox location under Program Files | Not found | Not proof of absence from custom installations |
| `vmware.exe`, `vmrun.exe`: application-only PATH lookup and exact VMware Workstation locations under Program Files and Program Files (x86) | Not found | No registry inventory, VM enumeration or vendor program execution |
| `qemu-system-x86_64.exe`: application-only PATH lookup and exact qemu location under Program Files | Not found | No recursive search or fallback execution |
| `Win32_ComputerSystem`: HypervisorPresent, TotalPhysicalMemory, NumberOfLogicalProcessors | Query unavailable; values unknown | No inference about installed hypervisors or usable capacity |
| `Win32_Processor`: VMMonitorModeExtensions, VirtualizationFirmwareEnabled, SecondLevelAddressTranslationExtensions | Query unavailable; values unknown | No firmware or virtualization-support conclusion |

The binary check attempted file-version readback only if a candidate existed; none did. These fixed vendor-relative locations are technical target descriptions, not captured personal paths. No existing VM list, disk image, user profile, personal directory, Codex configuration, credential, source database or process list was inspected. No elevation or expanded discovery followed unavailable queries. The cause of those failures remains unknown.

**Inference:** the observed `Core` edition and absent launcher do not establish a supported Sandbox route. Microsoft documents that Sandbox is unsupported on Home; Hyper-V's install guidance also excludes the Home editions ([DOC-016](evidence-catalog.md#doc-016-windows-disposable-environment-prerequisites)). This does not prove that no Windows hypervisor technology or third-party product could work on the machine.

## Candidate assessment and answers

**Official documentation:** Codex exposes CLI state-location settings, with `sqlite_home` configuration taking precedence over `CODEX_SQLITE_HOME`. Authentication can use files or the OS credential store; memory-only credential storage is documented. These are configuration mechanisms, not complete process isolation ([DOC-015](evidence-catalog.md#doc-015-codex-cli-location-authentication-and-persistence-controls)). No current Codex executable or settings were inspected.

**Design decisions:**

| Candidate | Decision and unresolved requirement |
| --- | --- |
| Redirected CLI home, current account | Reject as the isolation boundary: it does not exclude personal-profile access or inherited credentials |
| Separate Windows account | Defer: creation, credential boundaries and effective access need separately approved validation; do not inspect personal ACLs to justify it |
| Windows Sandbox | Not established as available here; no edition upgrade or feature enablement authorized |
| Fresh Windows VM | Preferred conditional route; installed mechanism/version, host resources, licensing, guest configuration and lifecycle remain unverified |
| WSL/Linux container | Exclude from native Windows acquisition validation |

Oracle's VirtualBox 7.2 manual supplies one concrete supported-product research candidate, not an installation recommendation or verified local selection. It documents guest hardware, sharing and networking configuration. Default NAT is not an endpoint allowlist and does not prove exclusion of host services ([DOC-017](evidence-catalog.md#doc-017-virtual-machine-configuration-and-networking)). No VirtualBox command, registry of guests or VM was opened.

| Required question | Answer at this gate |
| --- | --- |
| Can an installed mechanism create an isolated fresh guest? | Unverified: no candidate binary found within the bounded search; hardware queries unavailable |
| Can host folders, drives, clipboard, credentials and devices be excluded? | Required policy; product configuration controls exist in official documentation, but no actual guest configuration or isolation was verified |
| Can network access be limited to the approved model operation? | Unverified: disconnected networking can be the setup baseline; a later proposal must specify and test a supported egress restriction. NAT alone is insufficient |
| Can exact guest identity/storage/lifecycle be tracked? | Required future ownership manifest and supported manager operations; no guest identifier, path or disk has been selected |
| Can Windows/Node/PowerShell be provisioned? | Official distribution sources exist; guest eligibility, exact versions, integrity checks, resources and installation permissions remain unresolved |
| Can sanitized evidence leave the guest? | Design default is a small allowlisted text summary manually transcribed from the guest console; no screenshots, clipboard integration, shared folders, database export or raw diagnostics. This has not been exercised |

## Next proposal prerequisites: no setup authorized

**Design decision:** do not invent an exact executable version or owned location to make an unverified environment appear ready. A subsequent proposal must resolve these items before setup; an installation or edition change is a separately approved action, not a fallback in this slice.

1. Identify one exact supported hypervisor executable/version through a founder-supplied target or separately approved installation proposal. Verify host OS support, firmware virtualization and resource availability without scanning personal VMs. Do not silently substitute products.
2. Select a fresh licensed Windows guest image from Microsoft, exact edition/version and integrity verification. Record host and guest contexts separately. License rights and initial-account setup must be resolved without importing the personal Windows/Microsoft account or credentials.
3. Name a new owned host artifact root, guest identity and guest-local home, SQLite, project and scratch locations privately in the approval. Record only logical roles in the repository. Set exact CPU, memory, disk, runtime and acquisition limits after capacity and expected source sizes are known; no numbers are approved by this record.
4. Specify disabled host shares, clipboard, drag/drop, device/drive passthrough and credential integrations; no reused guest disks or user profiles. Verify actual settings and use invented control files before any Codex execution. Reject ambiguity without inspecting personal files.
5. Define guest networking initially disconnected, the exact reviewed installation/network window, model endpoint restrictions and how they are enforced/tested. Keep it disconnected during acquisition. No bridging, unrestricted NAT assumption or host credential proxy.
6. Pin reviewed guest tools and installation sources: [Node downloads](https://nodejs.org/en/download), [Microsoft PowerShell installation](https://learn.microsoft.com/en-us/powershell/scripting/install/install-powershell-on-windows?view=powershell-7.6), and the official Codex distribution referenced by DOC-015. These links are source candidates, not reviewed installers. The prior Node/PowerShell versions are evidence context, not an automatic guest support claim. Any dependency installation needs that next scope's permission.
7. Specify a dedicated test credential, model/request cost and duration caps, in-process secret delivery and permitted retention. Prefer memory-only credential storage and a single child-process credential scope; never use host cached authentication. Do not confuse ephemeral credentials with ephemeral sessions.
8. Define a reviewed code-only input bundle for the guest, sanitized console-summary output, normal guest shutdown, exact manager-owned destruction and residual reporting. No full host checkout/profile mapping or raw state export. State whether installation artifacts remain; do not promise broader uninstall/cleanup.

Until these are resolved, no exact setup proposal is execution-ready. The smallest next action is a separately scoped prerequisite/setup proposal, not disposable Codex execution or M2b.

## Later three-phase experiment: design only

### A. Create real disposable state

After isolation verification and separate authorization, launch one pinned native CLI in the guest against an invented project and input, with no requested tools. Explicit child-only state locations must resolve within the owned guest and obey verified configuration precedence. Do not change the host's environment settings. Require fresh guest credentials/configuration, bounded networking and no personal imports.

Use persistent session behavior; the documented `exec --ephemeral` omits rollout persistence and is unsuitable for this purpose (DOC-015). The ordinary read-only CLI sandbox is not the environment boundary. Track the experiment-owned process and its descendants from launch; keep any session correlation identity in memory. No Desktop, App Server or verification turns are included.

### B. Select and acquire after normal exit

Require normal CLI exit and confirmed cessation of relevant guest writers, using separately authorized guest-only lifecycle observation. Do not scan or kill host processes. Stable files or retained sharing handles alone do not prove closure. If closure cannot be established, refuse without acquisition.

Authorize one bounded nonrecursive metadata inventory of the exact newly created SQLite directory. Use version-specific source evidence to name one database and its exact companion paths in a sealed manifest. Multiple candidates or uncertain purpose require review; suffix, age and size are not selection rules. No historical filename is a current contract. Check corresponding WAL, SHM and rollback-journal presence; database-only or existing database/WAL/SHM are the current supported sets. Unsupported combinations, journals or set changes refuse; never force a WAL, checkpoint or recover a source. Global JSON, auth, logs, rollout content and other databases stay excluded.

The existing M2a.4 integration is **not reusable unchanged for these sources**: its filenames/schema are invented and its cleanup owns synthetic sources. A separate test-only binding must accept only the sealed disposable manifest, keep originals outside scratch ownership and use the helper to acquire the whole retained Open/Read/FileShare.Read set before writing copies. Source-set open failure disposes earlier handles and produces no copy. Acquisition data must flow through retained handles, into verified protected acquisition and separate analysis areas. Keep source handles through analysis and final verification. Do not stage an earlier unprotected source copy and call that original acquisition.

Preserve M2a.4 limits of 128 KiB/file, 256 KiB/five selected files and 21 files/six directories/1 MiB across its synthetic run. Real-source sizes may exceed them; metadata inventory may expose a limit gap, but raising limits needs separate approval. No native input mode, production/public helper interface or generalized discovery is authorized.

### C. Inspect only analysis copies

Authorize bounded schema structure and read-only SQLite version-field inspection, followed only by explicit queries against verified ordinary tables for the known session's source-local identity and stored CWD. Keep values in memory; report counts, schema-support status and equality/coverage booleans. Do not execute source SQL, inspect arbitrary views or unselected text, use `SELECT *`, or follow stored paths. Unknown schema or recovery requirements withhold conclusions. Never open originals or the untouched acquisition set through SQLite; no repair, checkpoint, vacuum or immutable workaround.

Whole-file acquisition exposes more than the selected metadata, even in a disposable guest; later approval must cover that full-copy exposure. Preserve separate source namespaces, provenance and incomplete coverage. Null/missing fields never establish projectlessness, deletion, corruption or audit completeness.

## Verification, privacy, cleanup and stops

**Design decisions for later execution:** compare source identity, size, modification/change times and in-memory hashes before/after acquisition and after analysis; verify copies and unchanged acquisition bytes. These are nonmutation regression observations, not process-attributed absence of transient writes. Incidental access-time changes remain distinct. Do not change designated-source ACLs or restore bytes after failure.

Allowlisted reports contain only runtime context, phases, file roles/counts, security/equality/coverage booleans and cleanup status. No paths, IDs, source bytes/hashes, raw errors/stacks, credentials, account names, SIDs or canaries. Preserve M2a.4's distinction between bounded accepted/buffered protocol data and unbounded total drained pipe transport. Keep disposable Codex observations separate from synthetic evidence and historical WIN records.

Scratch deletion belongs to the exact authenticated Workspace Surveyor run, only after confirmed handle closure/helper exit, known-entry checks and ownership retained through child deletion. Codex originals never belong to that cleanup. Guest disposal is a separate approved environment-manager action, after evidence review, against the exact owned guest/storage. Never individually edit/delete Codex databases to tidy the environment, sweep storage, loosen ACLs, kill processes or promise secure erasure.

Stop affected work on scope/identity ambiguity, inherited personal context, unknown writers/files, unsupported companions, limit violation, mutation, descriptor/protocol/privacy failure or cleanup uncertainty. Withhold affected findings and record residual status; no automatic retries or broader investigation.

## Completion and remaining unknowns

The authorized read-only checks and research established a precise readiness gap. No disposable guest, source or acquisition scratch was created by feasibility research; there is no research cleanup to perform. Regression-test artifacts are owned and cleaned only by their existing tests. Current validation results are recorded in [compatibility](../compatibility.md#disposable-codex-isolation-feasibility).

This slice changes documentation only. Native refusal, code, fixtures, helpers, dependencies and historical records remain unchanged. A later environment/binding gate requires explicit approval and independent review. Successful end-to-end disposable evidence could then justify proposing a narrowly qualified M2b adapter; it grants no personal canary or M2c authority.

Still unproven: host/guest isolation in practice, hardware capacity, guest provisioning and egress enforcement, actual source locations/schema, closure coverage, live or atomic database/WAL/SHM acquisition, mapped writers, hostile races, other-account effective access, other filesystems, transient source writes, abrupt termination cleanup, secure erasure and all Desktop/personal-state behavior.
