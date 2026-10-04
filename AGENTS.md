# Agent instructions

## Current authorization

M0/Foundation documentation and repository hygiene are authorized. Work within that slice and stop when it is complete. Later milestone implementation requires separate explicit authorization. A roadmap describes future work; it does not grant authority to execute it.

Permitted M0 changes: README, this file, contribution/security guidance, documentation, research records, founding ADRs, roadmap, and appropriate text/hygiene configuration.

The accepted product name is **Workspace Surveyor for Codex**, with **Workspace Surveyor** as the contextual short name. Follow [ADR 0006](docs/decisions/0006-project-naming-and-cli-surface.md) for technical names and the future synthetic CLI surface. Naming decisions do not authorize M1, publication, local-path changes, Local Project reassignment, or Thread/CWD migration. Preserve legacy names in historical observations and founding ADR wording.

Do not create scanner/CLI code, acquisition code, reconciliation or rules engines, Git discovery, visual UI, public APIs, package manifests, lockfiles, executable scripts, test frameworks, empty source scaffolding, generated schemas, plugin systems, or release workflows. Do not initialize packages or install dependencies.

## Private data and actions

- Do not inspect real Codex state, databases, session files, conversation metadata, auth, logs, or other private artifacts during M0.
- A specific read-only research authorization must identify the target and purpose. Authorization for documentation is not authorization for such research.
- Use the founder's supplied observations, official documentation, and invented examples only. Replace personal identifying details in supplied material.
- Never create repository copies of real paths, OS usernames, thread/project IDs, conversation titles, prompt text, screenshots, databases, sessions, or audit reports.
- Generic filenames, field names, environment-variable names, and placeholder paths are technical vocabulary, not private data. Label examples as synthetic.
- Workspace Surveyor must not directly mutate Codex-owned SQLite databases or Codex-owned JSON state. Any reversal requires an explicit superseding decision/ADR; see [ADR 0001](docs/decisions/0001-observation-and-action-boundary.md).
- Do not clean directories, move worktrees, delete records, or send verification turns during M0.
- Do not commit, publish, push, change repository visibility, or perform cleanup without separate authorization.
- Do not use a supported API merely because its name sounds read-only; investigate documented and observed side effects first.

## Documentation practice

Label behavioral claims as founder-observed experiment, official documentation, design decision, assumption, or unknown. Use the [evidence catalog](docs/research/evidence-catalog.md) for definitions and source IDs.

Preserve WIN-001 through WIN-017. Link proposed rules to evidence and counterexamples. Keep app version, agent version, Windows build, and schema gaps unknown unless contemporaneous evidence establishes them. Never backfill historical versions from a current installation.

Keep the original WIN-001–WIN-017 investigation separate from the later Project Boundary research group WIN-018–WIN-020. Article-derived founder evidence is not official documentation; register independently reviewed official claims separately. Do not transfer the original investigation's SQLite/schema context to the boundary group.

Project Boundary Diagnostics is documentation-only future scope beyond M1. M1 stays synthetic-only and excludes real boundary discovery, ancestry scans, configuration adapters, Git discovery/classification, AGENTS content inspection, instruction-loader emulation, verification turns, and boundary-specific UI. Documenting these concepts creates no runtime types, schemas, IDs, APIs, or research authorization.

Append later evidence and superseding results. Do not erase the historical reason for a rule when behavior changes. Update the [compatibility matrix](docs/compatibility.md) with applicability and retirement decisions.

Dated, attributed supporting supplements may refine the same experiment under its existing WIN ID without changing the original recorded result. Label their evidence and limits, preserve measurement timing, and correct summaries that overstate them. Distinct experiments receive separate records; a supporting supplement does not require a new WIN ID.

Keep the bootstrap architecture conceptual and simple. Defer runtime versions, driver choice, interfaces, frameworks, and packaging decisions until the relevant milestone.

## Validation and completion

Use existing shell tools for documentation review; no dependency installation is needed. Check relative links/anchors, observation coverage, source attribution, synthetic examples, prohibited artifacts, and consistency with the documentation-only status.

Ignore patterns are defense in depth, not proof of privacy. Review every proposed repository file. Do not stage content merely to inspect it.

At M0 completion, report the documents and hygiene files created, checks performed, and remaining unknowns. Stop before M1. Do not interpret M0 completion as permission to continue.
