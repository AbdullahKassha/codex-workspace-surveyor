# ADR 0003: Validate Windows first

- Date: 2026-10-04.
- Status: accepted founding design decision.
- Applies to: support claims, path behavior, acquisition, and future adapters.

## Context

**Founder evidence:** all supplied observations are Windows experiments. [WIN-012](../research/windows-2026-10-04.md#win-012) includes extended Windows path prefixes.

**Official documentation:** [DOC-004](../research/evidence-catalog.md#doc-004-native-windows-and-wsl-state) distinguishes native Windows and WSL state context.

**Unknown:** macOS source layouts, schemas, UI and lifecycle behavior. Windows build details and full baseline schema are also unknown.

## Decision

Target Windows-native first. Keep platform-specific discovery, path comparison, host context, and acquisition behavior separate from portable reasoning when implementation needs concrete boundaries. Do not assume macOS or WSL parity.

No platform support is certified in M0. Future macOS contributions must provide independent evidence, synthetic fixtures, compatibility context, and safety validation. Running portable tests on another OS is not product support.

## Alternatives considered

- Claim cross-platform support immediately: unsupported by evidence.
- Scatter Windows assumptions through general parsing: makes later adapters difficult and hides path/host mistakes.
- Establish a large platform framework now: unnecessary before working code clarifies the boundary.
- Document platform boundaries and implement a small Windows slice later: chosen.

## Consequences

Initial users need Windows-native coverage. Other platforms remain unknown rather than receiving optimistic defaults. Community contributions can add adapters after validating real behavior. Network/WSL locations require explicit scope and do not become ordinary local paths through string conversion.

## Revisit when

A separately authorized platform investigation supplies enough evidence and tests for a bounded supported adapter. Update the compatibility matrix without rewriting the Windows baseline as cross-platform evidence.

See [compatibility](../compatibility.md) and [Q-04/Q-05](../research/open-questions.md).
