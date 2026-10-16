# Security and privacy reporting

## Current status

The accepted Windows relationship explorer uses protected closed-app acquisition, bounded metadata-only folder/Git observation and a short-lived authenticated loopback browser. The bundled CLI remains synthetic; there is no published release or certification of arbitrary builds/schemas. [Compatibility](docs/compatibility.md) states tested scenarios and limits. Source nonmutation, title privacy, session access, cleanup uncertainty and conservative relationship classification remain security-relevant. Reproduce issues with invented sources and owned fixtures; no real Codex data is required.

## Reporting safely

Do not put private Codex data into issues, pull requests, comments, or attachments. A report should use synthetic identifiers and paths, describe the affected document or behavior, and explain the risk without reproducing personal content.

Do not attach personal database copies, rollouts, session files, screenshots, prompts, auth/config exports, or private audit reports. A reviewed screenshot of wholly synthetic fixtures may illustrate a report if it contains no personal paths, browser chrome or session credentials. Do not run a destructive experiment to demonstrate a problem.

A private reporting route has not yet been verified. If this repository's [Security advisories page](https://github.com/AbdullahKassha/codex-workspace-surveyor/security/advisories) offers **Report a vulnerability**, use that private form for sensitive security details. If it is absent or unavailable, withhold those details; no alternative private channel or security email address is established. Where public Issues are available, you may request a private contact route without including exploit details or personal data. No response-time commitment is established.

**Maintainer follow-up:** enable GitHub private vulnerability reporting and verify both the reporting form and notification delivery before describing the channel as available. This is a separate repository-setting action, not a completed part of this documentation update. See [GitHub's configuration guidance](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository).

For accidental disclosure, report the affected location without repeating the data. Removing a working-tree file alone does not remove Git history, attachments, caches, or published artifacts. Remediation must be explicitly scoped; repository cleanup is not automatically authorized by a report.

## Design boundary

The current explorer is local-first, with no user-data telemetry or uploads. Workspace Surveyor must not directly mutate Codex-owned SQLite databases or Codex-owned JSON state. Any reversal requires an explicit superseding decision/ADR. Supported operations require side-effect assessment and re-observation.

See [safety and privacy](docs/safety-and-privacy.md) for the intended boundary and [roadmap](docs/roadmap.md) for implementation gates.
