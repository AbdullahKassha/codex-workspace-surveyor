# Security and privacy reporting

## Current status

The accepted Windows relationship explorer uses protected closed-app acquisition, bounded metadata-only folder/Git observation and a short-lived authenticated loopback browser. The bundled CLI remains synthetic; there is no published release or certification of arbitrary builds/schemas. [Compatibility](docs/compatibility.md) states tested scenarios and limits. Source nonmutation, title privacy, session access, cleanup uncertainty and conservative relationship classification remain security-relevant. Reproduce issues with invented sources and owned fixtures; no real Codex data is required.

## Reporting safely

Do not put private Codex data into issues, pull requests, comments, or attachments. A report should use synthetic identifiers and paths, describe the affected document or behavior, and explain the risk without reproducing personal content.

Do not attach database copies, rollouts, session files, screenshots, prompts, auth/config exports, or private audit reports. Do not run a destructive experiment to demonstrate a problem.

If GitHub private vulnerability reporting is available for this repository, use it for sensitive security details. Its availability is currently unknown. Otherwise, request a private reporting channel without posting the sensitive details. No security email address or response-time commitment has been established.

For accidental disclosure, report the affected location without repeating the data. Removing a working-tree file alone does not remove Git history, attachments, caches, or published artifacts. Remediation must be explicitly scoped; repository cleanup is not automatically authorized by a report.

## Design boundary

The current explorer is local-first, with no user-data telemetry or uploads. Workspace Surveyor must not directly mutate Codex-owned SQLite databases or Codex-owned JSON state. Any reversal requires an explicit superseding decision/ADR. Supported operations require side-effect assessment and re-observation.

See [safety and privacy](docs/safety-and-privacy.md) for the intended boundary and [roadmap](docs/roadmap.md) for implementation gates.
