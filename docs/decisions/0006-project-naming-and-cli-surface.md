# ADR 0006: Project naming and CLI surface

- Date: 2026-10-04.
- Status: accepted pre-M1 design decision, approved by the founder.
- Applies to: product identity, future command naming, and repository rename boundaries.
- Does not supersede: ADR 0001–0005, evidence applicability, or milestone authorization gates.

## Context and alternatives: design judgment

The former working name was **Codex Workspace Doctor**, shortened to **Workspace Doctor**. Doctor suggests repair and installation health more strongly than the intended domain of workspace understanding, evidence, relationships, boundaries, and organization guidance. Inspector was considered but offers less separation from other Codex tooling. Workspace Topology describes an important capability better than the entire product.

The naming review preferred Surveyor for its observation, mapping, and boundary semantics. Of the two forms considered, **Workspace Surveyor for Codex** makes the project's own identity primary and describes Codex compatibility explicitly. **Codex Workspace Surveyor** was considered and rejected as the display-name order because it more readily sounds like an official Codex component. A separate invented brand adds complexity without a demonstrated benefit.

The 2026-10-04 naming review was point-in-time research, not a reservation, trademark clearance, or guarantee of registry acceptance. Recheck collisions and platform naming requirements before publication. This ADR records the design rationale, not new Codex behavioral evidence or a new WIN observation.

## Naming system: design decision

Use the full product name on first mention, repository introductions, package listings, and standalone displays. In visual branding, make Workspace Surveyor primary and "for Codex" secondary but clearly visible. Use distinct visual branding.

| Surface | Chosen name |
| --- | --- |
| Product/display name | Workspace Surveyor for Codex |
| Contextual short name | Workspace Surveyor |
| GitHub repository slug | `codex-workspace-surveyor` |
| Future npm package | `codex-workspace-surveyor` |
| Future executable | `codex-surveyor` |
| Future GUI title | Workspace Surveyor for Codex |
| Future plugin display name | Workspace Surveyor for Codex |
| Future plugin identifier | Prefer `codex-workspace-surveyor`, subject to platform rules and a fresh collision check |
| Integration display pattern | Workspace Surveyor for Codex — [Host] integration |
| Public abbreviation | None; do not install a `cws` alias |

`[Host]` is a synthetic placeholder, not a chosen integration. Technical names retain Codex-first ordering for discoverability; they do not determine display-name order. Document the executable as `codex-surveyor`, never `codex surveyor`, which would suggest an official Codex subcommand. Package naming and executable naming are separate decisions; no package or binary is created by this ADR. Do not publish placeholder packages to reserve names.

Keep the [capability vocabulary](../product.md#identity-and-capability-names-design-decision), including Workspace Topology and Project Boundary Diagnostics. These names do not create modules, interfaces, schemas, plugins, or additional M1 scope.

Use this disclaimer near the README introduction and in future package, GUI, and plugin descriptions:

> Workspace Surveyor for Codex is an independent community project for understanding and organizing Codex workspace relationships. It is not an official OpenAI product and is not affiliated with, endorsed by, or sponsored by OpenAI.

The repository remains a private foundation with no chosen license or claimed open-source release until the relevant gates are completed.

## M1 development surface: design decision

The following commands are a future specification, not currently runnable instructions:

```text
npm run cli -- demo
npm run cli -- demo overview
npm run cli -- demo disagreement
npm run cli -- demo coverage
```

Use one development entry script, `cli`, once M1 is separately authorized. It dispatches directly to the development entrypoint without a globally installed executable or public `bin` declaration. Replace the earlier proposed `npm run doctor -- demo` form. Defer redundant `npm run demo` shortcuts. Runtime versions and launcher choices remain deferred to the implementation milestone.

- `demo` defaults to `demo overview`; both explain the synthetic relationship model.
- `disagreement` demonstrates conflicting evidence without declaring corruption.
- `coverage` demonstrates incomplete evidence and unknown membership.
- Every scenario is deterministic and clearly labels its data as synthetic.
- Help lists all scenarios. Unknown scenarios produce a helpful usage error and never fall through into discovery.
- Successful demonstrations exit successfully even when the synthetic evidence contains disagreement or uncertainty.
- No scenario reads real Codex state, discovers real boundaries/Git relationships, or adds any other excluded M1 activity.

Later M1 verification must cover the default equivalence, all scenarios, help and invalid input, synthetic labels, uncertainty handling, excluded acquisition, and Windows invocation without a global binary. No test framework or implementation is introduced now.

## Repository rename and retained workspace: design decision

The approved naming change distinguishes six independent surfaces: product name, GitHub repository name, Git remote URL, local directory, Codex Local Project, and Thread CWD. A naming decision is not a CWD migration.

The bounded execution sequence is:

1. Prepare and review current-facing documentation and this decision. Preserve historical observation wording, WIN identifiers, source attribution, and founding ADR rationale.
2. Rename the existing GitHub repository in place under the same owner, preserving history, permissions, and private visibility.
3. Update the existing clone's remote URL through supported Git configuration, retaining the transport. Verify repository identity and the expected branch/commit.
4. Retain the local folder name `codex-workspace-doctor` and the existing Codex Local Project name/root, Thread assignments, and CWDs. Contributor guidance must explain that the legacy folder name is intentional.
5. Verify documentation, links, repository identity/history, and unchanged local location. Stop before M1. Commits and pushes require separate explicit authorization.

**Official documentation:** GitHub describes redirects after a repository rename, recommends updating clone remotes, and warns that reusing the old repository name breaks redirects. See [DOC-007](../research/evidence-catalog.md#doc-007-github-repository-renaming). This does not establish any Codex project or Thread migration behavior.

Rename acceptance requires consistent current-facing naming, preserved history, correct remote identity, and no local-folder or Codex project/Thread mutation. No manifests, dependencies, binaries, tags, release workflows, or source scaffolding are part of the rename.

## Deferred local-path migration: design decision and evidence limits

Local-path alignment is not required before M1. The [WIN-015–WIN-017 reconstruction](../research/cwd-migration.md) is founder-observed evidence with unknown historical versions, not a guaranteed bulk migration procedure. Assignment, runtime CWD, and later persistence are distinct observations; the exact persistence mechanism remains unknown. The projectless experiments do not prove migration behavior for every existing assigned Thread.

If a later local-path migration is requested:

- Obtain separately scoped authorization for inspection, movement, UI reassignment, and state-changing verification turns; first revalidate behavior in a disposable synthetic environment with contemporaneous versions.
- Identify affected Threads and other consumers through authorized observations, record incomplete coverage, and exclude managed worktrees from generic move procedures.
- Review recovery arrangements and quiesce relevant activity before moving the directory. Use supported filesystem, Local Project, and Thread assignment actions available on the target build.
- Verify each affected Thread: runtime location first, an agreed harmless marker only if the location is correct, then assignment/root and Copy working directory including after reopening. Do not assume a project-root change migrates existing Thread CWDs.
- Stop on fallback locations, disagreement, interrupted turns, or uncertain persistence. Keep unmeasured stored-state fields unknown; UI/runtime evidence is not a database measurement.
- Do not directly edit Codex-owned SQLite or JSON state. Remove old projects or perform cleanup only after successful verification and separate approval.

See the [qualified migration guide](../workflows/projectless-cwd-migration.md). This ADR neither authorizes that workflow nor retires any migration safeguard; [compatibility applicability](../compatibility.md) remains unchanged.

## Unknowns and revisit conditions

Future npm registration, plugin acceptance, target-build migration behavior, and historical version gaps remain unconfirmed. Recheck names before distribution; if the unscoped package becomes unavailable, review a maintainer-owned scope then rather than inventing or registering one now. A platform restriction or substantive confusion finding may warrant a later naming decision, recorded without erasing this rationale.
