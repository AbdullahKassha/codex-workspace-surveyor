# Contributing

## Current stage

This repository contains M0/Foundation documentation and the M1 synthetic CLI. Contributions within M1 may improve bundled invented scenarios, conservative explanations, tests, evidence traceability, and documentation. Real acquisition and diagnostics remain excluded.

Later implementation is separately scoped. Do not add acquisition, scanner code, dependencies beyond the approved tooling, or release automation as an incidental change.

## Project naming: design decision

Use **Workspace Surveyor for Codex** on first mention and **Workspace Surveyor** within an established context. "For Codex" describes compatibility, not an official OpenAI component. Use the independent-community disclaimer from the [README](README.md) in future package, GUI, and plugin descriptions.

The private package/repository name is `codex-workspace-surveyor`; the future executable is `codex-surveyor`. Existing clones may intentionally retain the local folder name `codex-workspace-doctor`. Work in the existing clone; do not rename a folder or reassign a Codex Local Project or Thread merely to match the remote name. Historical research and founding ADRs retain earlier names. See [ADR 0006](docs/decisions/0006-project-naming-and-cli-surface.md) for naming and migration boundaries. M1 uses `npm run cli -- demo` after a build, without a global binary or public bin declaration.

## Safe contributions

Use invented examples rather than redacted exports of real state. Redaction can miss identifying strings in nested fields, error messages, screenshots, and binary files. Do not upload databases, sessions, prompts, conversation titles, real identifiers, personal paths, screenshots, or private audit reports.

A useful synthetic reproduction describes the expected relationship, invents every identity, and includes a counterexample. A synthetic example demonstrates a design case; it does not reproduce Codex behavior by itself.

For behavior claims, state the [evidence category](docs/research/evidence-catalog.md#claim-categories), date, platform, app version, agent version, and schema context when known. Use `unknown` for missing information. Add a new record for a distinct experiment. A dated, attributed supporting supplement may refine the same experiment under its existing WIN ID while preserving the original recorded result. Label its limits and update affected summaries and [compatibility wording](docs/compatibility.md); do not silently overwrite earlier evidence.

Do not run experiments involving someone else's state. Obtain explicit, specific authorization before accessing private state or initiating a lifecycle experiment.

## Reviewing a contribution

- Check every changed file for identifying details and private artifacts.
- Check relative links and evidence references.
- Explain whether the change records evidence, makes a decision, states an assumption, or identifies an unknown.
- Include alternative interpretations and conditions for retiring a proposed rule.
- Keep architecture documentation conceptual until implementation requires concrete structure.

Use Node 24/npm 11. Run `npm ci --ignore-scripts --no-audit --no-fund`, `npm run typecheck`, and `npm test` (which builds first). The lockfile pins the toolchain; there are no runtime dependencies. See [README](README.md#run-the-synthetic-demonstration) for commands and [ADR 0007](docs/decisions/0007-synthetic-cli-foundation.md) for scope.

Fixtures are authored in the scenario module, with fixed illustrative timestamps, `synthetic-` identifiers and invented paths under `C:\Synthetic\`. Keep observations distinct from interpretation. Add semantic counterexamples for changed reasoning; review the three text goldens before deliberately updating them. Never automatically bless changed output. Tests may read repository files and launch the bundled CLI; application runtime code may only use bundled modules and terminal I/O. Import checks supplement manual review and are not a sandbox proof.

Check relative documentation links/anchors with existing shell tools. Synthetic fixture checks do not replace review of every proposed repository file. The [documentation index](docs/index.md) provides navigation.

## Open-source preparation

A license has not been selected. Do not represent the repository as a released open-source package. Public release will require an owner-selected license, full history/artifact review, a compatibility statement, and separately authorized publication.

See [security reporting](SECURITY.md) before reporting a privacy or safety issue.
