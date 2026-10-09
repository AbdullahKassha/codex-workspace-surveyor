# Workspace Surveyor for Codex

**Understand the relationships between Codex threads, Local Projects and stored working locations.**

Workspace Surveyor is a Windows-first, read-only explorer of Codex relationships. It helps explain shared working locations, stored Project assignments and uncertainty in the available evidence.

**Current status:** M2 private read-only validation is complete. M3a browser preparation is implemented, synthetic-tested and independently reviewed. Try it with invented data today; real titled-thread and Project browser exploration has not yet been demonstrated.

## Why it exists

Several threads can share a working location, Projects can declare overlapping folder roots, and assignments can disagree with stored locations. Workspace Surveyor brings these relationships together before you consider organization changes.

A **stored CWD** is the working-directory string recorded for a thread. It does not prove that the directory exists or is the thread's current runtime location.

## What the explorer shows

- **Locations:** exact stored-CWD groups containing titled thread records, with title and location search.
- **Projects:** Local Project labels, declared folder roots and recorded thread assignments, currently demonstrated with invented Project fixtures.
- **Details:** record IDs, assignments, ambiguity, provenance (where a claim came from) and coverage (what was inspected).
- **Uncertainty:** missing observations, conflicts and unresolved references remain visible. Matching path strings do not establish Project membership or filesystem identity.

## Current implementation

| Area | Status |
| --- | --- |
| Protected acquisition and thread ID/CWD mapping | Demonstrated in bounded, separately authorized, closed-app personal Windows runs, including local terminal display |
| Named-thread reader and relationship model | Implemented and tested with synthetic copies; real title semantics remain unqualified |
| Local browser explorer | Working synthetic Projects/Locations views, search and record details |
| Real Project decoding | Explicitly unavailable until exact source keys, types and reference relationships are qualified |
| General personal-state browser workflow | Not available; the current browser entry accepts invented fixtures only |

The earlier synthetic CLI remains available for bundled text explanations. There is no published package, globally installed command or public API.

<a id="run-the-synthetic-demonstration"></a>
## Try the synthetic demo

Use a native Windows checkout and PowerShell 7. The validated setup is Node **24.18.1**, npm **11.x**, and PowerShell **7.6.6** with .NET **10.0.12**.

Run from the repository directory in that PowerShell session:

```powershell
npm ci --ignore-scripts --no-audit --no-fund
npm run build

$env:WORKSPACE_SURVEYOR_HELPER_PWSH = [Environment]::ProcessPath
$env:WORKSPACE_SURVEYOR_RUN_CANARY_PREPARATION = '1'
$env:WORKSPACE_SURVEYOR_RUN_EXPLORER_PREPARATION = '1'
node dist/test/support/explorer-entry.js
```

The demo uses invented SQLite/JSON files and verified protected copies. Its temporary artifacts are removed before browser delivery. It does not read personal Codex state or use the real recovery slot.

Open the printed local URL. Browse **Locations** and **Projects**, search titles or locations, and select a record for details. Use **Close local session** or Ctrl+C to finish. The server expires after ten minutes if page-exit closure is not delivered.

For the older text demo, run `npm run cli -- demo` or `npm run cli -- demo disagreement`. Developer checks are `npm run typecheck` and `npm test`.

See the [preparation record](docs/research/m3a-explorer-preparation.md#synthetic-demonstration) for the verified procedure, validation results and runtime limits.

## How it works

Selected sources → protected acquisition and separate analysis copies → bounded metadata readers → evidence-bearing relationships → local browser view.

Browser delivery follows successful verification and cleanup. A temporary loopback server (accessible on this machine only) holds the dataset in memory and checks session access. Stored strings are rendered as text; paths have no filesystem actions.

## Current limitations and next steps

Real title semantics and Project structures remain unqualified; real Project decoding is unavailable. Compatibility depends on required data structures and acquisition capabilities, not Desktop version alone. Extra ordinary columns are ignored and reported as unconsumed observations.

The [local read-only entry](docs/research/explorer-local-read-only-validation.md) now uses explicit launch and bounded title previews. It derives a default source and accepts `--source` without saving the selection. This correction is synthetic-tested preparation pending focused review. Real title meaning still needs a founder comparison; exact Project/assignment structures remain unqualified. Repository/worktree relationships at selected roots follow later. Filesystem validation, full discovery, exports and organization actions remain future work.

## Privacy and read-only design

Workspace Surveyor does not mutate Codex-owned SQLite or JSON state. Explicitly launching the local explorer requests read-only inspection; it performs no background acquisition or automatic retry. The selected path is not saved; acquired datasets are not saved. The browser has no external assets, upload, browser storage, saved report or automatic refresh.

Cleanup covers authenticated, owned run artifacts. Historical synthetic residuals remain [disclosed](docs/research/m3a-explorer-preparation.md#validation); their removal is not claimed. Browser memory erasure and protection from external capture are not guaranteed.

## Independent project

Workspace Surveyor for Codex is an independent community project. It is not an official OpenAI product and is not affiliated with, endorsed by or sponsored by OpenAI. The package is private; no public release or open-source license is currently claimed.

## Documentation

- [Documentation index](docs/index.md)
- [Product direction](docs/product.md) and [roadmap](docs/roadmap.md)
- [Architecture](docs/architecture.md) and [relationship model](docs/relationship-model.md)
- [Compatibility and evidence](docs/compatibility.md)
- [M3a preparation and qualification requirements](docs/research/m3a-explorer-preparation.md)
- [Completed M2 display observation](docs/research/personal-local-display-observation.md)
- [Safety and privacy](docs/safety-and-privacy.md), [contributing](CONTRIBUTING.md) and [security reporting](SECURITY.md)
