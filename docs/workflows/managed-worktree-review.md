# Managed worktree review guide

## Evidence and status

**Founder evidence:** [WIN-010](../research/windows-2026-10-04.md#win-010) reports that removing a managed worktree through Codex's UI removed both the directory and Git registration. [WIN-009](../research/windows-2026-10-04.md#win-009) reports internal rows surviving visible cleanup; that is not a failed-cleanup proof.

**Official documentation:** [DOC-002](../research/evidence-catalog.md#doc-002-worktree-roots-and-lifecycle) supplies separate root/lifecycle context, not reproduction of the founder's experiment.

**Design decision:** prefer the owning application's supported lifecycle. This page is manual guidance, not an authorized cleanup action or functioning Workspace Surveyor command. M0 does not inspect worktrees, execute Git discovery, or remove anything.

## Review before action: design requirements

1. Establish which application owns the checkout. A directory under a familiar worktree root is not sufficient proof of management.
2. Record the actual worktree root, repository association, directory accessibility, and Git registration using only separately authorized reads. Custom roots mean default-root discovery can be incomplete.
3. Review linked chats, active activity, pinned/permanent status where available, and coverage limits. No observed linked chats does not establish abandonment.
4. Account for local changes, untracked/ignored material, submodules, embedded repositories, and required recovery. Do not assume a snapshot retains every file.
5. If removal is intended and separately authorized, use the owning application's supported Worktrees action on the target build. Verify the exact target and available retention/restore behavior first. Do not replace it with direct recursive deletion or Git prune/repair.
6. Re-observe both the physical directory and Git registration. Record missing access and incomplete coverage rather than declaring success from one source alone. Review related chats according to the operation's documented semantics.

## Stop and explain

Unknown ownership, inaccessible paths, active work, uncertain retention, or source disagreement require review rather than removal. Remaining internal records do not justify deleting SQLite rows or JSON references.

No universal rollback is established by M0. Source-state edits and repeated cleanup attempts are not remedies for incomplete verification.

## Future comparison

**Unknown:** current build's ownership evidence, custom-root discovery, ignored-file retention, and recovery semantics. See [Q-08](../research/open-questions.md#q-08) and [Q-10](../research/open-questions.md#q-10).

Append validated results to [WIN-010's compatibility row](../compatibility.md). Update or retire action guidance when supported lifecycle behavior changes; preserve historical evidence and the separation between app metadata and physical state.
