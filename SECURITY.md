# Security and privacy reporting

## Current status

The repository contains an executable M1 synthetic demonstration and an M2a.1 test-only synthetic acquisition kernel, with no supported real audit or published release. The CLI accepts only bundled invented scenarios and produces text. The kernel accepts only its generated invented fixtures; native scratch protection refuses before copying, and passing tests explicitly simulate that prerequisite. Safety and privacy design problems are still relevant, particularly accidental acquisition, disclosure, or advice that exceeds the evidence. No real Codex data is needed to reproduce an issue.

## Reporting safely

Do not put private Codex data into issues, pull requests, comments, or attachments. A report should use synthetic identifiers and paths, describe the affected document or behavior, and explain the risk without reproducing personal content.

Do not attach database copies, rollouts, session files, screenshots, prompts, auth/config exports, or private audit reports. Do not run a destructive experiment to demonstrate a problem.

If GitHub private vulnerability reporting is available for this repository, use it for sensitive security details. Its availability is currently unknown. Otherwise, request a private reporting channel without posting the sensitive details. No security email address or response-time commitment has been established.

For accidental disclosure, report the affected location without repeating the data. Removing a working-tree file alone does not remove Git history, attachments, caches, or published artifacts. Remediation must be explicitly scoped; repository cleanup is not automatically authorized by a report.

## Design boundary

The future tool is local-first, with no user-data telemetry or uploads by default. Workspace Surveyor must not directly mutate Codex-owned SQLite databases or Codex-owned JSON state. Any reversal requires an explicit superseding decision/ADR. Supported operations require side-effect assessment and re-observation.

See [safety and privacy](docs/safety-and-privacy.md) for the intended boundary and [roadmap](docs/roadmap.md) for implementation gates.
