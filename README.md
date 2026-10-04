# Workspace Surveyor for Codex

Understand the relationships between local Codex projects, chats, working directories, repositories, worktrees, and historical state before changing anything.

**Status: M0/Foundation documentation only.** There is no functioning scanner, CLI, visual report, installable package, or supported audit capability yet. The repository is in private bootstrap; a license has not been selected and no open-source release is being claimed.

Workspace Surveyor for Codex is an independent community project for understanding and organizing Codex workspace relationships. It is not an official OpenAI product and is not affiliated with, endorsed by, or sponsored by OpenAI.

**Naming decision:** Workspace Surveyor is the primary identity; "for Codex" describes compatibility. The chosen repository/future npm name is `codex-workspace-surveyor`, and the future executable is `codex-surveyor`. These names do not imply an available package or command. Existing local folders may retain `codex-workspace-doctor`; no folder or Codex Local Project migration is required. See [ADR 0006](docs/decisions/0006-project-naming-and-cli-surface.md).

## Why this project exists

Local Codex state can be difficult to understand because app identities and filesystem identities have different lifecycles. A chat can be projectless while retaining a real working directory. Several chats can share a folder. Removing a project can leave its chats and files intact. A renamed folder can leave a chat pointing to its old location.

These are **founder-observed Windows experiments from 2026-10-04**, not promises about every Codex release. The [research record](docs/research/windows-2026-10-04.md) preserves the observations with synthetic identifying details and explicit limits.

The intended workflow is:

**Inspect → understand → explain → detect risks → consider organization improvements → follow supported workflows → re-audit.**

The product should explain why something looks risky or worth organizing. An unusual relationship is not automatically broken, and an internal record is not automatically garbage.

## Intended product

The first engineering surface is a Windows-first, read-only CLI. A local visual relationship report is an explicit early milestone. The long-term experience should make projects, chats, directories, worktrees, evidence, and conflicts visually obvious.

Planned capabilities include conservative relationship reconciliation, evidence-linked advice, private audit snapshots, sanitized reports, and before/after comparisons. TypeScript/Node.js is the preferred stack; implementation details remain deferred.

Project Boundary Diagnostics is intended product scope beyond M1, with separate research and implementation authorization. It should explain why a child directory appears to be a separate project, why Git and Codex roots differ, whether a parent instruction file lies outside discovery scope, whether a nearby marker supports another boundary, or why evidence is insufficient. App project roots, thread CWDs, discovery boundaries, markers, Git roots, and instruction scope remain distinct.

This capability is explanatory: it is not Git repair, marker cleanup, AGENTS rewriting, configuration repair, or proof of ownership or an incorrect boundary. The [later boundary-research set](docs/research/project-boundary-observations.md) is separate from the original 17 experiments; no boundary discovery is implemented or added to M1.

See the [product definition](docs/product.md), [conceptual architecture](docs/architecture.md), and [milestone roadmap](docs/roadmap.md).

## Safety and privacy

M0 uses supplied observations, official documentation, and synthetic examples. It does not read private Codex state. Any future research involving real state requires specific authorization.

The planned product observes Codex-owned state and guides supported actions. Workspace Surveyor must not directly mutate Codex-owned SQLite databases or Codex-owned JSON state. Any reversal requires an explicit superseding decision/ADR. No automatic cleanup or migration is planned for the first CLI release.

Repository examples must be synthetic. Do not contribute real paths, identifiers, conversation titles, screenshots, databases, sessions, or private reports. See [safety and privacy](docs/safety-and-privacy.md), [contributing](CONTRIBUTING.md), and [security reporting](SECURITY.md).

## Start reading

- [Documentation index](docs/index.md): navigation and claim categories.
- [Relationship model](docs/relationship-model.md): what the entities mean.
- [Compatibility matrix](docs/compatibility.md): original WIN-001–WIN-017 and separate boundary WIN-018–WIN-020, version gaps, and retirement criteria.
- [Evidence catalog](docs/research/evidence-catalog.md): founder evidence and official sources.
- [Experimental CWD migration guide](docs/workflows/projectless-cwd-migration.md): qualified manual procedure, not an automated repair.

M0 implementation is authorized. Later milestones require separate scoped approval; completion of these documents does not authorize application development, private-state research, commits, or publication.
