# ADR 0004: Local privacy and synthetic repository artifacts

- Date: 2026-10-04.
- Status: accepted founding design decision.
- Applies to: research, reports, examples, fixtures, and releases.

## Context

**Design constraint:** local Codex metadata may include sensitive identities, directories, and conversation material. The founder intends eventual public distribution without personal artifacts.

**Unknown:** safe acquisition details, reporting contracts, security-reporting availability, and release license.

## Decision

Use synthetic identifying examples in the repository. Never copy real state or conversation artifacts into fixtures, research records, or support reports. M0 does not read private state; later research requires specific authorization.

The future audit is local-first with no telemetry/uploads by default. Local terminal output may show identifying metadata. Shareable reports are sanitized by default; identifying exports require explicit intent. Use field allowlists and report-local aliases rather than raw dumps followed by string replacement.

Private temporary acquisition copies are acceptable only outside Codex-owned directories and the repository, with validated access controls and lifecycle handling. They must never be included in reports or distribution artifacts.

## Alternatives considered

- Sanitize copied real databases: difficult to prove complete, especially for binary/deleted/nested fields.
- Redact every local terminal view by default: safer for screenshots but less useful for the agreed local workflow.
- Keep local views useful and sanitize shareable output: chosen, with explicit private exports.
- Upload state for diagnosis: outside the local-first default and initial product scope.

## Consequences

Fixtures require deliberate synthetic construction. Raw acquisition copies remain sensitive even if only metadata is parsed. Ignore patterns do not enforce privacy by themselves; full content/history/package review is required before public release.

Private snapshots may support local identity comparison. Independently aliased reports should not be silently compared as equivalent private snapshots. Secure erasure and recovery are not promised.

## Revisit when

A concrete capability needs additional metadata, with evidence of necessity, explicit authorization, and a reviewed handling policy. Any broader access or sharing must be separately decided; public-release pressure is not sufficient reason to weaken privacy.

See [safety and privacy](../safety-and-privacy.md), [contributing](../../CONTRIBUTING.md), and [security](../../SECURITY.md).
