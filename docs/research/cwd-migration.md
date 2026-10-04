# CWD migration experiment reconstruction

## Evidence and synthetic values

**Founder-observed evidence:** [WIN-015](windows-2026-10-04.md#win-015), [WIN-016](windows-2026-10-04.md#win-016), and [WIN-017](windows-2026-10-04.md#win-017), dated 2026-10-04, under [B0](../compatibility.md#baseline-context-b0). No independent reproduction occurred in M0. Historical version context is unknown.

All paths, marker values, identities, and titles on this page are invented. The table abbreviates:

- A: `C:\Synthetic\workspaces\cwd-probe-a`.
- B: `C:\Synthetic\workspaces\cwd-probe-b`.
- F: a synthetic dated fallback workspace, distinct from B.
- Marker: `probe.txt` containing `SYNTHETIC_MARKER_ALPHA`.

## Reported sequence

| Stage | Filesystem | Assignment | SQLite stored CWD | Copy working directory | Runtime evidence |
| --- | --- | --- | --- | --- | --- |
| Before rename | A exists with marker | Projectless | A | A | Thread used A |
| Rename while Codex closed | A absent; B contains marker | Projectless | A retained | A retained | No execution at B established |
| Restart and open thread | A absent; B exists | Projectless | A retained | A retained | Opening did not establish B |
| New turn with missing A | F created; B still exists | Projectless | Changed to F | F | Did not discover B |
| Open B as Local Project and assign | B exists | Assigned via UI to project rooted at B | Not checked immediately after assignment | Only immediate CWD check; still previous/fallback path | No successful B turn yet |
| During successful verification turn | B exists; marker read | Assigned to B project | No contemporaneous check reported | No contemporaneous check reported | B observed during execution |
| After successful verification turn | B exists | Assigned to B project | B observed afterward | B observed afterward | Prior turn observed B |
| Remove bridge project | B remains | Projectless | B retained | B retained | No new execution observation supplied |

**Supporting evidence:** the founder's dated [WIN-015 supplement](windows-2026-10-04.md#win-015) records an earlier failed PowerShell rename while Codex was running, followed by success after it was fully closed; the responsible process/handle was not identified. The [WIN-016 supplement](windows-2026-10-04.md#win-016) records the immediate check's scope and the Recents/list context-menu route, which was not visible in the in-thread menu used on that build/UI.

**Reported second case (WIN-017):** a real projectless thread was migrated from a historical directory to a descriptive destination using the bridge. Identifying details are replaced by `Synthetic Atlas Notes` and `C:\Synthetic\workspaces\atlas-notes`. Runtime, stored, copied, and project-root observations agreed after verification; the old path was absent. This account does not supply a second bridge-removal result.

## Conclusions and limits

**Design interpretation:** externally renaming a folder can leave a dangerous gap between filesystem location and thread metadata. Restarting or opening the thread did not repair that gap in the probe. A new turn can change state; it is not an inspection step.

Assignment, successful execution, and persisted verification are separate observations. Immediately after assignment, only the copied CWD was checked. Persistence was observed after the successful turn; the timing of the checks does not establish the exact persistence mechanism or trigger. Do not label migration successful at the assignment stage. The bridge sequence worked in two founder-reported cases, but remains experimental and version-bound.

**Unknowns:** whether later releases follow renames; the exact CWD persistence trigger; behavior after a failed/interrupted verification turn; whether project-level instructions change execution; effect on other threads sharing the original CWD; recoverability across worktrees or different volumes.

The recorded sequence does not prove a safe generic filesystem-move algorithm. It is not a reusable private-data fixture or an authorization to run the experiment again.

## Future validation: design decision

Use a separately authorized disposable synthetic environment. Capture contemporaneous versions, each state transition, access scope, and observed outcomes. Stop if runtime location is wrong. Record failed or contradictory outcomes as well as successes. Do not inspect unrelated state or backfill historical versions.

See [Q-09](open-questions.md#q-09) and the [qualified manual guide](../workflows/projectless-cwd-migration.md).
