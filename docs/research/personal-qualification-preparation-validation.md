# Bounded copied-schema qualification preparation

## Scope and provenance

**Design decision, 2026-10-06:** [ADR 0010](../decisions/0010-copied-schema-qualification.md) supplements the original private canary with one fixed qualification action. This record describes agent-executed synthetic validation, not a personal-source observation. [PCAN-001](personal-canary-observation.md) separately records the founder's successful earlier run. No new personal state, source, process or real recovery slot is inspected here. The original one-run authorization cannot be reused.

Baseline: `44453cd787e383d0d4652e0838eb05d15065c7fd`, plus this uncommitted preparation change set. Windows synthetic helper tests select installed PowerShell **7.6.6 / .NET 10.0.12** explicitly; Node is **24.18.1**, libuv **1.52.1**, embedded SQLite **3.53.1**. Built-in runtime observations report `win32`, `x64`, Windows release **10.0.26300**. Those runtime measurements are separate from the preceding Desktop About/package observations and do not identify a Codex source revision.

Historical ADRs, M2a.1–M2a.4 records, original canary preparation measurements and all **five synthetic residual disclosures** remain unchanged. No historical lost locator is searched for. No new residual is intentionally retained by these tests; independent harness cleanup is available for every new fixture.

## Fixed inspection and output

The original canary's two-query inspection remains unchanged. Only `analysis: 'qualification'` selects the new private path. It opens the protected analysis copy with read-only and defensive SQLite settings, no extensions, no double-quoted string literals, query-only mode, trusted schema disabled and bounded SQLite limits. Originals and untouched acquisition copies are never opened through SQLite. Source handles remain held during analysis, followed by the existing source/acquisition verification and authenticated cleanup.

The exact three statements are recorded in [ADR 0010](../decisions/0010-copied-schema-qualification.md#decision). The founder approved projecting `cid, name, type, hidden` from the table-valued xinfo function instead of the direct PRAGMA, specifically to exclude default expressions. Schema structure is kept in memory. No `sqlite_schema.sql`, defaults, source-supplied statements or record strings are selected. Fixed statement identity supplements phase-specific authorizers; arbitrary SELECTs cannot exploit the column permissions needed by `typeof`.

The candidate table and fields are hypotheses. One ordinary `main.threads` table with at most 64 columns is required, with exact ordinary TEXT `id`/`cwd` fields. All hidden/generated columns are conservatively unsupported, including unrelated ones. No replacement mapping is inferred. Schema errors, malformed analysis and a source-defined shadow of the schema table function refuse with sanitized diagnostics.

The only added result is `qualification`, containing `structure`, `sample`, `idText`, `cwdText`, `idNull` and `cwdNull`. An accepted empty table has `sample: absent` and null flags. A populated table returns only booleans derived from the first row's storage types/nullness; no ordering or coverage is claimed. Nontext and null values do not alone fail structure acceptance or imply any semantic conclusion. Unsupported structure reports no sample. Other failures set `qualification: null`; cleanup/recovery failure cannot return a sample as a successful finding.

Unsupported structure runs the normal final verification and cleanup before returning reason `unsupported`. Its legacy `files`, `schemaReadable` and `sourcesStable` fields remain withheld (zero/false) because the overall run refused; allowlisted `verified` stage and cleanup results describe completion of safety work. A thrown analysis error follows existing refusal/recovery handling. Neither case repairs sources or retries acquisition.

## Synthetic cases and validation

The new tests create databases in the fixture builder area, then establish separate raw sources. They never open a designated source through SQLite. Unit tests use simulated owned scratch to test query mechanics; those do not establish DACL protection. Five explicitly opted-in integration cases use the unchanged managed helper and verified protected scratch.

- Ordinary populated, empty, null and blob samples; exactly 64 columns accepted and 65 refused.
- Missing table, renamed/case-different/missing fields, absent or incompatible declared types, generated fields/columns, views and virtual tables refused without alternative discovery.
- Non-allowlisted SQL denied in every analysis phase, including raw IDs/CWDs, defaults, catalog SQL, attachments, extension loads, mutation, additional statements and altered statement text.
- Source-defined schema-function shadowing, malformed analysis and injected canary-bearing exceptions refuse without diagnostic disclosure.
- Protected database-only and WAL/SHM acquisition, analysis, final verification and exact cleanup succeed with invented content.
- Unsupported structure and injected inspection failure preserve originals; cleanup failure reaches its intended stage, withholds the sample, and subsequent exact synthetic recovery succeeds.
- Acquisition bytes and source metadata/content remain unchanged in unit cases; integration checks additionally use the existing final source/acquisition verification. Unrelated synthetic sentinels survive.

Measured on **2026-10-06**, with personal canary and qualification opt-ins explicitly disabled throughout:

| Check | Passed | Skipped | Failed |
| --- | --- | --- | --- |
| Targeted qualification suite, helper opt-in | 24 | 0 | 0 |
| Full explicit synthetic helper/canary suite | 203 | 0 | 0 |
| Full ordinary suite | 98 | 105 | 0 |

The full explicit suite took approximately 223 seconds, including the existing recovery lifetime/deadline tests. Ordinary runs explicitly skip empirical helper cases; skips are not Windows-control validation. Typecheck and build passed. Existing semantic/counterexample, text golden, CLI, P1 recovery and P2 startup tests remain included. The new 24 cases comprise 19 ordinary analysis tests and five protected-helper integration tests.

Documentation review passed for **356** relative links/anchors across **38** Markdown documents and all **20** historical WIN anchors. Scope/privacy review covers the 12 intended files: eight guidance/documentation files and four private implementation/test files. `git diff --check` and separate untracked-file whitespace review passed. No staged, generated/private or recovery artifact is included. The original managed helper, recovery worker, acquisition kernel/fixture builder, product CLI, package/dependencies and historical records remain unchanged. No personal state, processes or real recovery slot were accessed; no staging, commit, push or personal execution occurred. Independent review remains pending.

## Future manual procedure: no execution permission

1. Obtain independent review of this preparation, then a **new** explicit one-run authorization covering these three fixed statements, full-copy exposure, the exact privately selected source and companions, complete writer list, runtime, scratch and fixed recovery policy. Define its own recovery allowance. Do not reuse PCAN-001's consumed consent or assume its files are retained.
2. Build/review the private entry before closing Codex. Reconfirm the selected installed runtime and reviewed code. Keep private paths out of source files, command arguments, environment variables, terminal history and transcripts. The selected helper executable remains a runtime setting, not source selection.
3. Close all approved writers normally, including this chat. Use an unrecorded standalone ordinary-account terminal; do not run from an agent session. Keep those writers closed until completion. No killing, elevation or runtime fallback is allowed.
4. Set the already reviewed helper selection, `WORKSPACE_SURVEYOR_PERSONAL_CANARY=1` and the additional `WORKSPACE_SURVEYOR_PERSONAL_QUALIFICATION=1`. Invoke `node dist/test/support/personal-canary-entry.js` without arguments. These switches do not confer consent. Choose hidden action `QUALIFY`; the original `CANARY` and `RECOVER` actions keep their prior meanings.
5. Enter the separately authorized exact source, OS temporary parent and finite writer names through the existing hidden prompts. Use the distinct phrase `AUTHORIZE ONE QUALIFICATION RUN` only after the new approval. Full-copy exposure, 16 MiB/file, 32 MiB selected content, two protected copies and fixed authenticated recovery limits are unchanged from [the original procedure](personal-canary-preparation-validation.md#manual-external-run-procedure-future-design-not-execution-permission).
6. Save only sanitized result JSON and exit code. Do not retain schema output, records, hashes, diagnostics or paths. Unsupported structure stops; never search for replacement tables, repair or repeat acquisition automatically. An empty sample provides no row evidence.
7. Cleanup must positively remove scratch and recovery controls before success. An unsuccessful residual preserves available recovery material. Use `RECOVER` only under the new authorization's explicit allowance; it performs no SQLite inspection. Lifetime or authentication uncertainty refuses. No broad search, permission repair or source-parent cleanup is permitted.

The current work ends at synthetic preparation. Nothing in this procedure authorizes execution, recovery-slot inspection or M2b.

## Remaining limits

No real `threads` structure or row has been qualified. One later sample would establish neither complete schema compatibility nor record coverage, uniqueness, membership, CWD meaning, physical path identity or record classification. No stored path is followed. Read-only and bounded result sizes do not bound every SQLite execution or establish hostile-input isolation.

Atomic DB/WAL/SHM consistency, live writers, mapped writers, complete writer coverage, hostile path races, alternate-account access, other filesystems, process-attributed zero writes, abrupt termination, power-loss durability and secure erasure remain unproven. Accepted/buffered subprocess output is bounded; total pipe transport is not claimed bounded. Success would justify only a separately reviewed proposal for a narrowly qualified M2b adapter.
