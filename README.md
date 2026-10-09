# Workspace Surveyor for Codex

**Understand the relationships between Codex threads, Local Projects and stored working locations.**

Workspace Surveyor is a Windows-first, read-only explorer of Codex relationships. It helps explain shared working locations, stored Project assignments and uncertainty in the available evidence.

**Current status:** the browser now decodes the observed Desktop Project registry and reconciles it with copied Thread metadata. It groups inferred user-facing Threads, Projects and comparable stored locations, with unclassified and historical/internal records separated. The founder reported a successful real-data browser run for relationships and diagnostics, but found SQLite titles did not match Desktop. The correction now prefers matching session-index names; corrected real-browser acceptance and independent review remain pending.

## Why it exists

Several threads can share a working location, Projects can declare overlapping folder roots, and assignments can disagree with stored locations. Workspace Surveyor brings these relationships together before you consider organization changes.

A **stored CWD** is the working-directory string recorded for a thread. It does not prove that the directory exists or is the thread's current runtime location.

## What the explorer shows

- **Workspace:** connected groups of registry Projects, inferred user-facing Threads and comparable stored locations; empty/possibly-empty Projects remain visible.
- **Locations and Projects:** titles, declared roots, assignments and explicit projectless markers, with search and record details.
- **Unclassified and Diagnostics:** unknown/conflicting membership, unsupported classification, archived/internal records and stale references remain separately inspectable.
- **Details:** record IDs, assignments, ambiguity, provenance (where a claim came from) and coverage (what was inspected).
- **Uncertainty:** missing observations, conflicts and unresolved references remain visible. Matching path strings do not establish Project membership or filesystem identity.

## Current implementation

| Area | Status |
| --- | --- |
| Protected acquisition and thread ID/CWD mapping | Demonstrated in bounded, separately authorized, closed-app personal Windows runs, including local terminal display |
| Named-thread reader and relationship model | Exact-ID session-index title enrichment with bounded SQLite fallback, source/archive classification, normalized Windows location grouping; UI visibility is inferred |
| Local browser explorer | Workspace/Projects/Locations, search, evidence details and explicit Thread deeplinks |
| Real Project decoding | Fixed observed `local-projects`, `thread-project-assignments`, `projectless-thread-ids` shapes; actual-shaped fixtures use invented values |
| Personal browser workflow | Founder-reported relationship display succeeded; corrected title/UI acceptance remains pending |

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

The approved standalone entry is `node dist/test/support/personal-explorer-entry.js` after building. Close local Codex/ChatGPT Desktop normally first. Database, global-state JSON and session-index JSONL default to the current user's `.codex` directory; `--source`, `--global-state` and `--session-index` override the respective path for this invocation only. No repeated opt-ins or typed consent phrases are required. After the verified-snapshot message, reopen Desktop to compare its UI with the memory-only browser. No new turns, deletion or migration are needed. Close the browser session when finished.

Missing/incompatible Project metadata leaves retained Threads under Unclassified with unknown membership. Missing/incompatible title-index metadata preserves Threads and relationships with compact SQLite fallback headings and visible title provenance. Index-only records never create Threads. Source protection, file/data limits and cleanup uncertainty still refuse delivery. Title/source semantics and UI correspondence need the [bounded real comparison](docs/research/explorer-local-read-only-validation.md#real-projectthread-slice-2026-10-09); no metadata rule universally proves visibility. Lexical Windows matching does not establish filesystem identity. Folder inventory, Git/worktrees, migration, exports and automatic refresh remain deferred. Direct live SQLite access remains disabled: an owned-fixture probe demonstrated that a read-only connection can create a shared-memory sidecar.

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
