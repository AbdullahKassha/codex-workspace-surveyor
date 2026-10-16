# Getting started

Workspace Surveyor for Codex runs from a native Windows checkout. Use the [accepted baseline](roadmap.md#current-position-and-priorities-2026-10-16). This is a source-checkout preview, with no published installer or package. See [compatibility](compatibility.md) for evidence and limits.

## Prerequisites and setup

Use Node **24** on PATH, npm **11**, and PowerShell **7**, normally installed under `Program Files/PowerShell/7`. Keep the checkout outside the temporary tree; containment safeguards refuse unsafe repository locations. From the repository directory:

```powershell
npm ci --ignore-scripts --no-audit --no-fund
npm run build
```

Build again after updates. For a nonstandard PowerShell installation, set `WORKSPACE_SURVEYOR_HELPER_PWSH` to the absolute path of its installed `pwsh.exe` before launch. The launcher never installs prerequisites or builds automatically. Git is not required for ordinary observation; the disposable Git demo below requires it.

## Open and refresh the Explorer

Double-click [Workspace Surveyor.cmd](../Workspace%20Surveyor.cmd). The default browser opens the UI immediately; Desktop may stay open for UI startup. A fresh session requests acquisition, which requires Codex and ChatGPT Desktop to be closed normally. If that attempt refuses, close Desktop normally and click **Refresh**. After success you may reopen Desktop and inspect the memory-only snapshot. Failed, ongoing or cancelled refreshes retain the previous successful view and its selected entity where identity remains valid.

Relaunch opens the existing session's successful snapshot without Refresh; its original **Last updated** time and age stay visible. Use **Refresh** explicitly for newer data. If no snapshot exists, relaunch requests acquisition unless work is already active or temporary copies need recovery attention. It never queues another attempt behind active work or hides a recovery warning.

- **Browser reload** reconnects without inspection. Closed or expired snapshots cannot be restored.
- **Closing a tab** disconnects that view. **Close session** in the page closes the host and all attached views.
- **Cancel refresh** withholds replacement and waits for protected cleanup. Ctrl+C in the original console also closes after cleanup.
- Sessions expire after two hours without deliberate user activity, with a twelve-hour absolute maximum.

The visible console stays open until session closure; review its final result and press a key. Forcibly closing it can leave authenticated recovery artifacts.

Before allocating acquisition scratch, Explorer validates recovery state and makes a bounded read-only Desktop process check. Running Desktop or an unavailable check refuses setup. The acquisition helper still performs its authoritative closure, source-integrity and cleanup checks. This early check adds neither durable authorization nor live Refresh.

The launcher runs Node with the repository directory as its working directory, restores the caller's directory and preserves Node's exit status. It never closes applications or retries automatically. A temporary current-user pipe child coordinates launches; there is no service, locator file or saved browser token. Different source selections/versions or uncertain ownership refuse a second host. If browser dispatch cannot be confirmed, the console supplies one temporary URL. Keep that URL private; dispatch does not prove page rendering.

## Source selection and discovery scope

Database, global-state JSON and session-index JSONL default respectively to `.codex/state_5.sqlite`, `.codex/.codex-global-state.json` and `.codex/session_index.jsonl` under the current user home. These are conventions, not proof of effective Desktop configuration. The invocation-only overrides are `--source`, `--global-state` and `--session-index`, each followed by one absolute local file path. No selection is persisted. Close an existing session before launching with different selections.

The Windows launcher uses exactly `%USERPROFILE%\Documents\Codex` for bounded folder/Git discovery when that directory exists, and displays the invocation scope. If unavailable, it explains that standalone folder discovery is disabled and continues Project/Thread inspection; it never searches alternative roots. An explicit `--discovery-root <absolute-local-folder>` overrides the convention. For example, from PowerShell in the checkout, using an invented root:

```powershell
& '.\Workspace Surveyor.cmd' --discovery-root 'C:\Synthetic\workspaces'
```

Reusable-session metadata reads, including Git reference targets, are restricted to that root. External locations remain visible as **uninspected**; structural ancestor checks establish path/reparse safety only. Containment does not establish Project membership or merge Workspace groups. See the [discovery validation and bounds](research/explorer-local-read-only-validation.md#filesystem-git-2026-10-10).

## Standalone fallback

From the checkout after building, with Desktop closed normally:

```powershell
node dist/test/support/personal-explorer-entry.js
```

This entry prints a manual URL after verified acquisition and cleanup, requires an explicit `--discovery-root` for discovery and retains its one-use, ten-minute lifecycle. The same source overrides apply. Explicit launch requests inspection without repeated opt-ins or typed consent phrases. After the verified-snapshot message, you may reopen Desktop to compare its UI. No new turns, deletion or migration are needed.

## If launch or Refresh refuses

- **Missing prerequisites or compiled output:** check Node 24, npm 11 and PowerShell 7, then complete setup/build. Windows PowerShell 5.1 does not substitute for the protected helper.
- **Desktop is running:** close Codex and ChatGPT Desktop normally, then request Refresh. The launcher never terminates them.
- **Another session or different selections:** close the existing session normally before changing source/version selections. Do not bypass occupied recovery controls.
- **Temporary-copy recovery:** wait for active cleanup. When offered, **Recover temporary copies** requests one explicit recovery action; it does not automatically refresh. Unknown or unresolved controls require the [documented recovery/incident procedure](research/personal-canary-preparation-validation.md#recurrent-recovery-blocker-2026-10-14). Do not manually delete controls, unknown objects or historical residuals.
- **Missing optional metadata:** incompatible/missing Project data can leave membership unknown; unavailable title enrichment uses qualified fallback labels. Source protection, required data limits, integrity or cleanup uncertainty still refuse delivery. Consult visible Diagnostics and [compatibility](compatibility.md), rather than weakening safeguards.

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

For the older text demo, run `npm run cli -- demo` or `npm run cli -- demo disagreement`. For the bounded development checks, see [Contributing](../CONTRIBUTING.md#development-checks).

See the [preparation record](research/m3a-explorer-preparation.md#synthetic-demonstration) for the verified procedure, validation results and runtime limits.

## Screenshot provenance

The [README illustration](assets/explorer-synthetic.png), captured on 2026-10-16, shows the unmodified UI from the existing [disposable folder/Git demo](../test/support/folder-explorer-entry.ts), using invented records and authentic temporary repositories/worktrees. Its fixture tree is removed before browser delivery; displayed paths describe observations made while those fixtures existed. It demonstrates the relationship view, not reusable-session acquisition or Refresh controls. The capture uses a neutral owned temporary location and includes application content only, without personal paths, browser chrome, session credentials or console output. The replacement is a direct lossless Playwright PNG: **1920 × 958 pixels**, rendered at **deviceScaleFactor: 2** from a 960-pixel-wide desktop layout. The frame ends after the first complete Project/repository/worktree group and its selected Details. Legibility was visually checked in a browser at a representative **896-pixel README display width**. No upscaling, sharpening or UI/style changes were applied.

For implementation details and dated validation, see the [documentation index](index.md). Synthetic checks demonstrate mechanics; they do not certify real Codex behavior.
