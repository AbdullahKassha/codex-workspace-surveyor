# ADR 0008: Synthetic acquisition-safety kernel

- Date: 2026-10-04.
- Status: accepted design decision; founder explicitly authorized implementation of the narrowed M2a.1 plan.
- Applies to: a test-only synthetic kernel, not personal acquisition or a real adapter.
- Does not supersede: ADR 0001–0007 safety boundaries or historical evidence.

## Decision

Keep the private package, existing toolchain and synthetic CLI. Add a small internal kernel and fixture builder under `test/support`, invoked only by Node tests. There are no external source inputs, CLI acquisition commands, public APIs, serialized contracts or new dependencies.

Each run generates invented SQLite/JSON fixtures in a builder area and raw-copies them to designated sources. SQLite never opens designated source paths. Explicit selection accepts only the three fixed fixture basenames; sources cannot be registered from outside the run. The database table is deliberately named `invented_threads`, not a Codex schema claim.

Raw reads are capped; acquisition verifies the existing companion set, hashes, file identity, size and modification/change times. Fixed write destinations are separate from sources. Untouched acquisition files and analysis copies have different directories. Analysis selects only invented metadata and never emits row values or exceptions. Refusal withholds all findings. Cleanup verifies run ownership and all entries before removing exact current-run synthetic files, without recursive deletion or foreign sweeps.

## Windows protection limitation

**Official documentation:** [DOC-008](../research/evidence-catalog.md#doc-008-node-windows-filesystem-limitations) establishes limitations of Windows mode/access checks and the documented Node open flags. These do not establish restrictive scratch DACLs or the proposed deny-write/delete sharing strategy.

**Design decision:** native protection always produces `protection-unverified` before source copying. Only explicit `simulated-owner-restricted` fault injection exercises copying mechanics, using invented bytes. This is a simulation of the permission prerequisite, not verified Windows protection. The unique directory, mode arguments, owner token, fixed names and containment checks support ownership/isolation regression tests; they are not an access-control proof or a sandbox against hostile code.

PowerShell/.NET sharing or ACL helpers remain research candidates. No helper, subprocess or production helper architecture is added. A later proposal must request scoped approval before adding one. M2a.1 completion does not require solving this limitation.

## Scope and acceptance

Support a standalone synthetic database or a database with both existing WAL and SHM. A missing single companion, rollback journal, unreadable input, unstable set, excessive size or unsupported invented schema refuses acquisition. No original repair, checkpoint, vacuum, journal-mode change, companion deletion or immutable workaround is permitted.

Use deterministic fault injection for represented read/copy/cleanup failures and measurement-boundary changes. Do not perform full-disk exhaustion, forced crashes, real concurrent Codex writers, process-attributed tracing, aggressive replacement races, disposable Codex experiments or personal reads.

Validate typecheck/build, existing semantic tests and goldens, CLI isolation, source/analysis separation, privacy canaries, ownership/containment, limits, refusal and exact cleanup. Record results and limitations in [M2a.1 validation](../research/synthetic-acquisition-validation.md) and [compatibility](../compatibility.md#m2a1-synthetic-kernel-validation). No synthetic result reproduces Codex behavior.

## Later gates

Require separate approval for stronger Windows validation/helpers, then isolated disposable Codex experiments, the first real adapter, a single explicitly authorized personal canary, and conservative audit integration. Git/worktree mapping is deferred. Every private-source approval names targets, permitted data/operations, full-copy exposure, scratch storage, retention and cleanup. Snapshots, diffs, exports, visual UI, boundary diagnostics, migrations, verification turns, distribution, commits and publication remain excluded from M2a.1.
