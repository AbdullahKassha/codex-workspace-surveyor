# PLD-001: Founder-reported local relationship display

Evidence category: founder-reported standalone personal experiment, supplied in the current 2026-10-07 session. Exact execution time is unknown. Intended reviewed preparation: `e1f6f3fd1534537a7b9a179bae4a5781e86e8318`; the report does not independently attest the executing commit or runtime.

The founder supplied these sanitized results, not a complete JSON result:

| Field | Reported value |
|---|---|
| status | passed |
| rowsRead / claims | 146 / 146 |
| omittedRows / ambiguousIds | 0 / 0 |
| cwdGroups | 15 |
| schemaReadable / sourcesStable | true / true |
| cleanup / recovery | removed / removed |
| display | closed |
| exit code | 0 |

Do not reconstruct missing JSON. Compared with [PMAP-001](personal-thread-cwd-observation.md), 139 and 146 are separate reported traversals, not a measured record diff. Cleanup and display closure are reported by the run, not independently re-inspected. The authorization is consumed; no reusable map or source copy remains.

This completes M2's private Windows read-only validation milestone: selected closed-app state could be acquired, bounded ID/CWD claims interpreted and displayed locally, and cleanup reported successful. It does not establish visible-chat coverage, title semantics, Project membership, filesystem identity, live/atomic acquisition, universal writer coverage or complete history. No private paths, IDs, hashes, source/schema contents or recovery material are recorded here.

The founder found UUIDs grouped beneath exact CWDs useful for validation but insufficient for the actual product. The terminal viewer is now regression infrastructure. [M3a](m3a-explorer-preparation.md) proceeds to named records, evidence-bearing relationships and a local browser view; it does not polish the TUI or reuse the consumed permission.
