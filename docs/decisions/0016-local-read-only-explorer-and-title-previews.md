# ADR 0016: Explicit local launch and bounded optional title previews

- Date: 2026-10-08.
- Status: accepted for synthetic implementation; focused independent review before real use.
- Category: design decision superseding the everyday explorer consent choreography in [ADR 0015](0015-personal-titled-browser-preparation.md).

## Decision

Explicitly launching the local read-only explorer expresses the user's intent to inspect the selected local source and display its metadata in the existing loopback browser. Remove the explorer's per-run personal opt-in flags and typed consent phrase. Each launch performs at most one acquisition, without automatic retry or background inspection. Subsequent manual launches are permitted by this usage model; `attemptConsumed` remains operation-start telemetry, not an expiring permission or authorization ledger. Legacy CANARY, QUALIFY, MAP, terminal-display and RECOVER entry gates retain their historical behavior.

**Revised decision, 2026-10-09:** derive the default source with `join(os.homedir(), '.codex', 'state_5.sqlite')`. Accept exactly one optional `--source <absolute-local-database-path>` override under the existing path rules. This default is a product convention, not evidence of effective Codex storage. Missing or incompatible sources refuse; never search for alternatives. Reject malformed arguments and the removed `--change-source` option before acquisition. Show the safely escaped selection locally without prompting. Overrides are ordinary command arguments and may appear in shell history; sanitized results omit them.

Remove the uncommitted preference implementation rather than repairing its temporary-file transaction. No source selection is saved in files or the registry. No existing preference is inspected, migrated or removed. The two independently reproduced ownership races arose after closing the temporary-file handle and before pathname-based replacement/deletion; eliminating the transaction removes both vulnerable paths. Historical validation results remain recorded in the validation document.

Derive temporary storage through the existing runtime and recovery through the existing Windows known-folder mechanism. Derive the standard PowerShell path from `ProgramFiles`, unless explicitly selected by `WORKSPACE_SURVEYOR_HELPER_PWSH`. No installation or source search is added.

Required ID/CWD values retain 16 KiB UTF-8 per-field and 1 MiB cumulative encountered-text bounds. Row overflow still refuses the whole map at the 1,001st row. Source limits remain 16 MiB/file and 32 MiB selected content. Protected acquisition, original nonmutation, verification, closed-app requirements, persistent recovery and cleanup gating remain binding.

Optional titles use a separate 4 KiB UTF-8 preview limit and 256 KiB total retained-preview budget. The fixed projection fetches at most 4,100 encoded bytes per title, including four lookahead bytes that are never displayed. One fixed `PRAGMA main.encoding;` check qualifies UTF-8, UTF-16LE or UTF-16BE on the analysis connection, including WAL state; it adds no application fields or schema discovery. Strict decoding validates boundary sequences without retrying with discarded invalid bytes. Retained previews fit both 4 KiB encoded bytes and 4 KiB UTF-8. Shortening is visible; NUL/control/bidi characters retain existing escaped rendering. Malformed/nontext/empty/unqualified titles, unknown encodings and previews exceeding the aggregate budget receive explicit unavailable-title fallbacks. Neither shortened nor unavailable labels invalidate otherwise valid required relationships. Structural title acceptance remains distinct from Desktop label semantics.

SQLite's internal record-length ceiling increases from 1 MiB to the existing 16 MiB acquired-file ceiling so a large optional title can be projected without fetching it wholesale into Node. Required-field checks remain unchanged. Result and memory bounds do not establish a hard SQLite execution-time bound.

Limit diagnostics contain finite categories only: row, ID/CWD field, required cumulative text, source file/total, scratch and recovery controls. Reader refusal preserves independently completed copying, schema checking, source verification, helper exit and cleanup evidence; it releases no dataset. Helper/protocol failures retain their own categories rather than inventing a limit attribution.

Real Projects, JSON access, source discovery, Git/worktree enrichment, filesystem inspection of stored paths, dataset export/persistence and live acquisition remain excluded. Browser closure/cancellation and no-cache/session authentication remain unchanged. Implementation and tests use invented sources only; no personal execution follows automatically.

See the [usage and validation record](../research/explorer-local-read-only-validation.md).
