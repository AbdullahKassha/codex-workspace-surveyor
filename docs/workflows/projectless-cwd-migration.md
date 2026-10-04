# Experimental projectless CWD migration guide

## Status and evidence

**Founder evidence:** the Windows bridge worked in [WIN-016](../research/windows-2026-10-04.md#win-016) and [WIN-017](../research/windows-2026-10-04.md#win-017), after the missing-CWD behavior in [WIN-015](../research/windows-2026-10-04.md#win-015). Immediately after assignment in the probe, only Copy working directory was checked and it showed the previous path. Runtime CWD was the destination during the successful turn; Copy working directory and SQLite stored CWD showed it afterward. Persistence was observed after that turn; the exact mechanism or trigger is unknown. Historical versions are unknown.

**Design decision:** preserve this as a qualified manual workflow, not an officially guaranteed migration API. This document does not authorize executing it. M0 contains no audit command, automated move, assignment tool, or verification-turn sender.

All example values are synthetic. Example destination: `C:\Synthetic\workspaces\atlas-notes`; marker: `probe.txt` containing `SYNTHETIC_MARKER_ALPHA`.

## Preconditions: design requirements

Obtain separately scoped authorization for inspection and any moves, UI changes, or turns. Establish source/destination identity, all observed consumers of the source directory, active activity, and recovery arrangements. A partial audit cannot prove there are no other consumers.

Exclude managed worktrees from generic folder-move guidance. Shared directories, nested projects, unknown ownership, running activity, conflicting destinations, and inaccessible paths require review before a move. Do not use a new turn as a harmless way to inspect a missing CWD.

The directory move itself needs its own reviewed procedure. This guide does not supply a universal filesystem-move command. Review destination content and project instructions before trusting/assigning the folder.

## Manual sequence: design guidance derived from experiments

1. **Capture the before state.** Record assignment, copied working directory, filesystem location, and any separately authorized stored-CWD evidence. Record unknowns and coverage. Until an audit exists, use explicitly authorized manual observations; do not invent a Doctor CLI command.
2. **Establish the destination.** Perform only the separately approved filesystem operation, or verify the already moved folder. Ensure the destination is the intended source content. If the old CWD is missing, the recorded fallback risk applies before another turn is sent.
3. **Open the destination as a Local Project.** Use the supported folder-opening/trust UI available on the target build. Stop if its root differs from the intended destination.
4. **Assign the existing thread.** Use its supported Project action. In WIN-016 it was found in the Recents/list view's thread context menu and was not visible in the in-thread menu used; this route is build/UI-specific. Keep assignment evidence separate from CWD evidence; copied CWD may still show the previous/fallback path at this stage. An immediate copied-CWD check does not establish SQLite's value at that moment.
5. **Run a separately approved verification turn.** Limit it to checking runtime location first and, only if correct, reading an agreed harmless marker at the destination. It changes Codex state and may execute tools. If runtime location is wrong, stop; do not search broadly or keep retrying turns.
6. **Verify persistence.** Compare runtime CWD, Copy working directory, project root, assignment, and separately authorized stored-CWD evidence. Agreement must be observed, not inferred from successful assignment or marker content alone.
7. **Optionally remove the temporary project.** Only after successful verification and explicit intent, use supported UI removal. In the probe the thread remained projectless with destination CWD; confirm this rather than assuming it on the target build.
8. **Re-audit.** Check the thread, relevant consumers, directory state, and remaining references. Record failures, partial coverage, or unexpected replacements. Workspace Doctor must not directly mutate Codex-owned SQLite databases or Codex-owned JSON state. Any reversal requires an explicit superseding decision/ADR.

## Stopping conditions

Stop if the runtime location is incorrect, content identity is uncertain, a fallback appears, assignment/root disagrees, access is incomplete, the turn fails/is interrupted, or persistence cannot be verified. State the observed discrepancy. Do not label migration complete or attempt database repair.

Recovery must follow the previously reviewed arrangements. An audit snapshot is not a backup. The experiment did not establish a universal rollback mechanism or managed-worktree migration procedure.

## Revalidation and retirement

**Unknown:** applicability to the current target build and failed/interrupted turns. Before recommending the bridge as validated for a release, run a separately authorized disposable experiment under [Q-09](../research/open-questions.md#q-09).

Retire or narrow this guidance when supported migration behavior is validated, when Codex safely follows renames, or when the bridge stops working. Preserve the founder's original result and append the new context in the [compatibility matrix](../compatibility.md).
