# Contributing

Workspace Surveyor for Codex is a Windows-first source-checkout preview. The founder identifies `2a12ecf9fa757b6f1a32adec60892620f06acee3` as the accepted baseline. A license has not been selected; do not represent the repository as a released open-source package. See the [roadmap](docs/roadmap.md#current-position-and-priorities-2026-10-16) and [tested scenarios](docs/compatibility.md).

## Useful contributions

Documentation corrections, clearer explanations, invented reproductions and semantic counterexamples help maintain this project. Describe the problem, expected behavior, proposed change and relevant evidence. A synthetic reproduction should invent every identity and include a counterexample; it demonstrates a design case rather than independently reproducing Codex behavior.

Keep changes focused. New acquisition mechanisms, scanners, dependencies, release automation and behavior changes require their own agreed scope. Use existing evidence and validation records rather than expanding the documentation solely to fill a perceived gap. No general support service or response-time commitment is established.

## Safe contributions

Use invented examples rather than redacted exports of real state. Redaction can miss identifying strings in nested fields, error messages, screenshots and binary files. Do not upload personal databases, sessions, prompts, conversation titles, identifiers, paths, screenshots or private audit reports. A reviewed illustration captured from wholly synthetic fixtures is appropriate when it contains no personal environment details, credentials or browser chrome. See [security reporting](SECURITY.md) before sharing a privacy or safety issue.

For behavior claims, state the [evidence category](docs/research/evidence-catalog.md#claim-categories), date, platform, app version, agent version and schema context when known. Use `unknown` for missing information. Add a new record for a distinct experiment. A dated, attributed supplement may refine an existing experiment while preserving its original result; label its limits and update affected summaries and [compatibility wording](docs/compatibility.md). Do not silently overwrite earlier evidence.

Do not run experiments involving someone else's state. Obtain explicit, specific authorization before accessing private state or initiating a lifecycle experiment. Documentation and fixtures do not authorize personal runs.

## Development checks

Use native Windows, Node 24 and npm 11. [Getting started](docs/getting-started.md) covers PowerShell 7 and synthetic browser demonstrations. Install the pinned development dependencies, typecheck and build:

```powershell
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm run build
```

There are no runtime package dependencies. The package's `npm test` script builds and selects every test file, including historical live-acquisition research. For the current bounded ordinary regression run, use a fresh PowerShell session with experimental opt-ins disabled and exclude that research file:

```powershell
Get-ChildItem Env:WORKSPACE_SURVEYOR_RUN_* | Remove-Item
$ordinaryTests = @(Get-ChildItem -LiteralPath dist/test -Filter '*.test.js' -File |
    Where-Object Name -ne 'live-acquisition-feasibility.test.js' |
    ForEach-Object FullName)
node --test @ordinaryTests
```

This selection includes semantic/counterexample tests, the three text goldens and CLI tests. Optional helper/protected groups may skip; report actual passes, skips and environment limitations. Do not claim an all-opt-in or personal-validation pass. Do not enable historical live-research experiments or search for their unresolved residuals as routine validation.

Fixtures use invented data in exact owned temporary runs. Review golden changes deliberately; never automatically bless changed output. Explorer tests exercise reader, discovery and browser boundaries with owned fixtures. Tests may read repository files and launch the bundled CLI; the CLI itself may use only its bundled modules and terminal I/O. Import checks supplement manual review and are not a sandbox proof.

## Reviewing a contribution

- Review every changed file and asset for identifying details or private artifacts; ignore patterns alone do not prove privacy.
- Check relative links/anchors, source attribution and consistency between current summaries and dated records.
- Explain whether claims record evidence, decisions, assumptions or unknowns. Include alternative interpretations and retirement conditions for proposed rules.
- Describe the change and actual validation results. Preserve historical measurements, counterexamples, failed experiments and residual disclosures.

The original M2a.1 kernel remains under `test/support`, outside CLI imports. Its native-protection refusal and explicitly simulated fixture protection remain distinct from later managed-helper paths. Preserve these boundaries; see [ADR 0008](docs/decisions/0008-synthetic-acquisition-kernel.md) and the [architecture](docs/architecture.md).

## Project naming

Use **Workspace Surveyor for Codex** on first mention and **Workspace Surveyor** within an established context. “For Codex” describes compatibility, not an official OpenAI component. Retain the independent-project disclaimer from the [README](README.md).

The private package/repository name is `codex-workspace-surveyor`; `codex-surveyor` remains a future executable name, not an installed command. Existing clones may intentionally retain `codex-workspace-doctor`. Do not rename folders or reassign Local Projects, Threads or CWDs merely to match the remote name. Historical research and founding ADRs retain earlier names. See [ADR 0006](docs/decisions/0006-project-naming-and-cli-surface.md).

## Open-source preparation

An owner-selected license, full history/artifact review, compatibility statement and separately authorized publication remain public-release prerequisites. The existing `private` package setting is not a license or a statement of GitHub repository visibility. No publication or repository-setting change is implied by a contribution.
