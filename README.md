# Workspace Surveyor for Codex

**Understand the relationships between Codex Threads, Local Projects, working folders and Git worktrees.**

Workspace Surveyor is a Windows-first, read-only explorer of Codex relationships. It helps explain shared working locations, stored Project assignments and uncertainty in the available evidence.

**Current status:** the Filesystem/Git Discovery and Workspace Relationship Explorer milestone was founder-accepted and independently reviewed at `d15c78b121074c78a3b3492e369c3e89c85ca93e`, reported 2026-10-10. The light vertical browser presents numbered relationship groups, meaningful locations, selection details and discreet Diagnostics. The next priority is Evidence & Compatibility; see [tested scenarios and limits](docs/compatibility.md).

## Why it exists

Several threads can share a working location, Projects can declare overlapping folder roots, and assignments can disagree with stored locations. Workspace Surveyor brings these relationships together before you consider organization changes.

A **stored CWD** is the working-directory string recorded for a thread. It does not prove that the directory exists or is the thread's current runtime location.

## What the explorer shows

- **Workspace:** a light, vertical relationship tree in numbered groups. Assigned Threads nest beneath their actual Projects; declared roots and unique Thread working folders have explicit connections. Shared locations appear once with references. Verified linked worktrees nest beneath their main repository.
- **Standalone entities:** projectless Threads, unassociated folder roots, empty Projects and missing roots remain visible. Ordinary subdirectories have no browsing UI.
- **Needs review and Diagnostics:** unresolved current relationships remain reachable; internal, archived and stale records stay in Diagnostics.
- **Details:** friendly names, related entities, relevant paths/status, explicit Copy ID/Copy path and validated Thread deeplinks. Technical provenance and coverage stay in Diagnostics.
- **Uncertainty:** missing observations, conflicts and unresolved references remain visible. Matching path strings do not establish Project membership or filesystem identity.

## Current implementation

| Area | Status |
| --- | --- |
| Protected acquisition and thread ID/CWD mapping | Demonstrated in bounded, separately authorized, closed-app personal Windows runs, including local terminal display |
| Named-thread reader and relationship model | Exact-ID session-index title enrichment, narrowly qualified friendly title presentation, source/archive classification and conservative Windows location grouping; UI visibility is inferred |
| Local browser explorer | Compact Workspace, global/local Thread expansion, browser Find, selection details, Diagnostics and explicit Thread deeplinks |
| Real Project decoding | Fixed observed `local-projects`, `thread-project-assignments`, `projectless-thread-ids` shapes; actual-shaped fixtures use invented values |
| Personal browser workflow | Accepted bounded Windows workflow at the milestone above; not certification of every Desktop release, source schema or Git layout |

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

Open the printed local URL. Browse **Workspace** and select a row for Details. Use your browser's Ctrl+F to find a visible name. When a Project has more than five ordinary Threads, **Show all Threads** exposes every Thread and **Collapse all Threads** resets Projects to five; individual **Show more / Show fewer Threads** controls also work. The global control is hidden when unnecessary. Use **Diagnostics** for technical observations. Use **Close session** or Ctrl+C to finish. The server expires after ten minutes if page-exit closure is not delivered. For an authentic Git/worktree browser demo, run `node dist/test/support/folder-explorer-entry.js` after building; its owned temporary fixtures are removed before delivery.

For the older text demo, run `npm run cli -- demo` or `npm run cli -- demo disagreement`. Developer checks are `npm run typecheck` and `npm test`.

See the [preparation record](docs/research/m3a-explorer-preparation.md#synthetic-demonstration) for the verified procedure, validation results and runtime limits.

## How it works

Selected sources → protected acquisition and separate analysis copies → bounded metadata readers → evidence-bearing relationships → local browser view.

Browser delivery follows successful verification and cleanup. A temporary loopback server (accessible on this machine only) holds the dataset in memory and checks session access. Stored strings are rendered as text; paths have no filesystem actions.

## Current limitations and next steps

The approved standalone entry is `node dist/test/support/personal-explorer-entry.js` after building. Close local Codex/ChatGPT Desktop normally first. Database, global-state JSON and session-index JSONL default to the current user's `.codex` directory; `--source`, `--global-state` and `--session-index` override the respective path for this invocation only. Add `--discovery-root <absolute-local-folder>` to inspect bounded physical directories and Git relationships. No repeated opt-ins or typed consent phrases are required. After the verified-snapshot message, reopen Desktop to compare its UI with the memory-only browser. No new turns, deletion or migration are needed. Close the browser session when finished.

Missing/incompatible Project metadata leaves retained Threads with unknown membership under Needs review or Diagnostics. Titles prefer the latest valid exact-ID session-index name, then a narrowly qualified complete Markdown skill-link title. All other fallback titles receive `Thread <short ID>`; raw SQLite prompts are never displayed or searched. Index-only records never create Threads. Source protection, file/data limits and cleanup uncertainty still refuse delivery. No metadata rule universally proves visibility. Lexical Windows matching does not establish filesystem identity. Folder/Git discovery is invocation-only: directories remain distinct from Codex membership, containment does not merge Workspace groups, and standard linked worktrees require reciprocal administrative metadata. Git installation is unnecessary for observation. Missing, inaccessible, excluded and limited observations remain visible. See [launch, bounds, disposable demo and real acceptance](docs/research/explorer-local-read-only-validation.md#filesystem-git-2026-10-10). Migration, exports and automatic refresh remain deferred. Direct live SQLite access remains disabled: an owned-fixture probe demonstrated that a read-only connection can create a shared-memory sidecar.

Workspace prioritizes Project roots, ordinary Thread CWDs, Git trees and unassociated folder branches. Threads nest beneath their assigned Project. One Source folders branch sits at group level, with selectable references to each declaring Project; different Thread CWDs use selectable references. Shared physical folders appear once. Suitable standalone roots show one observed single-child parent as visual context, without merging groups or listing ordinary descendants. Internal directory observations remain in the model without inventory UI. Independently meaningful nested roots remain visible. Five Threads per Project appear initially; useful global expansion exposes all ordinary Threads for browser Find. Routine exclusions and depth limits remain in Diagnostics; failed discovery roots or checks at displayed working locations warrant a Workspace notice. Details separates exact-path existence from recursive coverage, including outside-scope roots. Failed checks include bounded stage information in Diagnostics, without raw exceptions. Folder launching is not supported.

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
