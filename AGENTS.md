# Agent instructions

## Current authorization

M0/Foundation and M1 are complete. The founder explicitly authorized the narrowed M2a.1 synthetic acquisition-safety kernel on 2026-10-04. Work only within that synthetic test-harness slice and stop at M2a.1 completion. Later validation and implementation require separate explicit authorization. A roadmap describes future work; it does not grant authority to execute it. See [ADR 0008](docs/decisions/0008-synthetic-acquisition-kernel.md).

Permitted M2a.1 changes: invented SQLite/JSON fixture builders; explicit harness-owned source selection; bounded raw reads/copies; ownership, containment, overlap and stability checks; existing database/WAL/SHM acquisition; separate untouched acquisition and analysis copies; conservative refusals; exact current-run synthetic artifact cleanup; fault injection, privacy and source-write regression tests; supporting documentation. Keep the kernel under `test/support`, outside CLI imports. No dependency installation, Windows helper or acquisition subprocess is authorized. Native scratch protection remains unverified and must refuse copying; explicitly labeled simulated protection may exercise invented fixture mechanics only. SQLite may open fixture builder and analysis paths, never designated sources.

Real-state access, disposable Codex experiments, process/trace inspection, forced crashes, full-disk simulations, live writer/replacement races and production helpers remain excluded. Only cleanup of exact current-run Workspace Surveyor-owned synthetic artifacts is authorized. Do not inspect broader temporary storage or private sources. Approval of the broader M2 direction is not approval of these later activities.

Permitted M1 changes: the single private TypeScript/Node package, exact development dependencies and lockfile, bundled invented scenarios, internal observation/interpretation types, conservative text explanations, CLI, tests, and supporting documentation/hygiene. See [ADR 0007](docs/decisions/0007-synthetic-cli-foundation.md). Inputs are bundled scenarios only; output is text only.

The accepted product name is **Workspace Surveyor for Codex**, with **Workspace Surveyor** as the contextual short name. Follow [ADR 0006](docs/decisions/0006-project-naming-and-cli-surface.md) for technical names and the future synthetic CLI surface. Naming decisions do not authorize M1, publication, local-path changes, Local Project reassignment, or Thread/CWD migration. Preserve legacy names in historical observations and founding ADR wording.

Do not create real scanners/acquisition, Git or boundary discovery, a generalized rules engine, visual UI, public APIs/JSON contracts, generated schemas, plugins, release workflows, or empty scaffolding. The existing dependencies suffice for M2a.1; do not install dependencies. No public bin declaration or global executable installation. Use the cli script, never a doctor script. Preserve the existing local folder, Local Project, Thread assignments, and CWDs; no rename or migration work.

## Private data and actions

- Do not inspect real Codex state, databases, session files, conversation metadata, auth, logs, or other private artifacts during M2a.1. No App Server inspection, real filesystem ancestry scans, AGENTS diagnostics, or verification turns.
- A specific read-only research authorization must identify the target and purpose. Authorization for documentation is not authorization for such research.
- Use the founder's supplied observations, official documentation, and invented examples only. Replace personal identifying details in supplied material.
- Never create repository copies of real paths, OS usernames, thread/project IDs, conversation titles, prompt text, screenshots, databases, sessions, or audit reports.
- Generic filenames, field names, environment-variable names, and placeholder paths are technical vocabulary, not private data. Label examples as synthetic.
- Workspace Surveyor must not directly mutate Codex-owned SQLite databases or Codex-owned JSON state. Any reversal requires an explicit superseding decision/ADR; see [ADR 0001](docs/decisions/0001-observation-and-action-boundary.md).
- Do not clean unrelated directories, move worktrees, delete records, or send verification turns during M2a.1. Only the approved exact current-run synthetic artifact cleanup is permitted.
- Do not commit, publish, push, change repository visibility, or perform other cleanup without separate authorization.
- Do not use a supported API merely because its name sounds read-only; investigate documented and observed side effects first.

## Documentation practice

Label behavioral claims as founder-observed experiment, official documentation, design decision, assumption, or unknown. Use the [evidence catalog](docs/research/evidence-catalog.md) for definitions and source IDs.

Preserve WIN-001 through WIN-017. Link proposed rules to evidence and counterexamples. Keep app version, agent version, Windows build, and schema gaps unknown unless contemporaneous evidence establishes them. Never backfill historical versions from a current installation.

Keep the original WIN-001–WIN-017 investigation separate from the later Project Boundary research group WIN-018–WIN-020. Article-derived founder evidence is not official documentation; register independently reviewed official claims separately. Do not transfer the original investigation's SQLite/schema context to the boundary group.

Project Boundary Diagnostics is documentation-only future scope beyond M1. M1 stays synthetic-only and excludes real boundary discovery, ancestry scans, configuration adapters, Git discovery/classification, AGENTS content inspection, instruction-loader emulation, verification turns, and boundary-specific UI. Documenting these concepts creates no runtime types, schemas, IDs, APIs, or research authorization.

Append later evidence and superseding results. Do not erase the historical reason for a rule when behavior changes. Update the [compatibility matrix](docs/compatibility.md) with applicability and retirement decisions.

Dated, attributed supporting supplements may refine the same experiment under its existing WIN ID without changing the original recorded result. Label their evidence and limits, preserve measurement timing, and correct summaries that overstate them. Distinct experiments receive separate records; a supporting supplement does not require a new WIN ID.

Keep the architecture simple. M1 uses Node 24, npm 11, TypeScript, and Node's built-in test runner in one private package. Defer drivers, acquisition interfaces, frameworks, and distribution until the relevant milestone.

## Validation and completion

Run typecheck, build, semantic/counterexample tests, text goldens, and CLI tests. Use existing shell tools for documentation review. Check relative links/anchors, observation coverage, source attribution, synthetic examples, prohibited capabilities, and consistency with synthetic-only status. No synthetic test certifies real Codex behavior.

Ignore patterns are defense in depth, not proof of privacy. Review every proposed repository file. Do not stage content merely to inspect it.

At M2a.1 completion, report delivered files, checks performed, and remaining unknowns. Stop before later M2a validation, disposable Codex experiments, real adapters or private research. Do not commit, push, publish, add helpers or start those activities without separate authorization.
