# Synthetic two-field adapter validation

## Scope and implementation evidence

**Design decision / synthetic implementation validation, 2026-10-07:** [ADR 0011](../decisions/0011-thread-cwd-adapter-preparation.md) authorizes a private adapter candidate using invented analysis copies only. [PSQ-001](personal-qualification-observation.md) separately records the founder's personal qualification. No personal ID/CWD string is available from that report, and no personal map is claimed.

Baseline is `dbac3cd0973c8bf35b68317447b0df5b82b3ecca` plus this preparation change set. The previous 203 explicit passes and 98 ordinary passes/105 skips remain historical qualification results. Existing source limits, protected acquisition, original inspections, managed helper, persistent recovery and product/native refusal are unchanged.

The new module takes an owned scratch capability and caller provenance. Direct analysis tests use simulated owned scratch; those do not establish DACL security. Opted-in Windows integration uses the existing synthetic selection, injected closure observations, copied-stage hook and managed helper. No actual Codex process or real recovery slot is inspected.

## Behavior and boundaries

The schema policy and exact SQL are fixed in ADR 0011. Iteration stops at the 1,001st row and refuses the whole map, rather than returning truncated claims. UTF-8 field and cumulative string limits bound retention; omitted-row strings also consume budget. No source fields beyond ID/CWD are read as application data. All database content inspection targets analysis copies; builder connections close or remain only on builder files while raw designated sources are created.

Claims retain exact stored strings and source-local identity. Duplicate IDs remain separate claims with ambiguity, including an ID repeated in an omitted row. Exact-string grouping does not establish path equivalence. Omission counts mark partial interpretation independently of complete selected-table traversal. Missing/malformed structure and resource failures return unavailable with no retained claims or provenance.

The synthetic wrapper stages the map internally. Only a passed acquisition with stable sources, readable analysis, confirmed helper exit and scratch/recovery removal releases a usable result. Diagnostics serialize fixed summaries only; explicit internal accessors expose values to assertions in memory. Neither the synthetic M1 model nor renderer is reused for these private-value-shaped records. The coordinator and personal entry are not changed.

An unconsumed-column flag indicates extra ordinary columns, not new drift. No personal schema baseline was retained. Versions do not select an adapter or bypass required invariants. No hard SQLite execution-time limit, secure memory erasure or hostile same-account isolation is claimed.

## Test coverage

- Shared and distinct CWDs, empty input, namespace separation, duplicate/conflicting IDs and invalid-row omissions.
- Opaque case, Unicode, extended-path, UNC and relative-looking values, with filesystem-operation interception proving stored strings are not followed.
- Additional ordinary columns through 64 accepted; missing/renamed/case-different fields, incompatible types, generated columns, views, virtual tables and 65 columns refused before row queries.
- Exact row, UTF-8 field and total-text boundaries; overflow withholds all claims, including limits encountered on omitted rows.
- Exact-query denial, schema-function shadowing, malformed copies, injected errors and successful JSON/diagnostic serialization with canary-bearing values.
- Protected standalone and WAL/SHM copies, unsupported-schema cleanup, post-analysis acquisition verification failure and cleanup-failure withholding followed by exact recovery. Originals and unrelated sentinels survive.

## Measured validation, 2026-10-07

The selected installed host was PowerShell **7.6.6** with .NET **10.0.12**. Node was **24.18.1**, libuv **1.52.1**, embedded SQLite **3.53.1**, on Windows `win32`/`x64`, release **10.0.26300**. These are synthetic validation context, not runtime measurements from PSQ-001. No SDK was required.

| Check | Passed | Skipped | Failed |
| --- | ---: | ---: | ---: |
| Targeted adapter, explicit synthetic opt-in | 39 | 0 | 0 |
| Full explicit synthetic helper/canary suite | 242 | 0 | 0 |
| Ordinary suite, ordinary-account context | 132 | 110 | 0 |

Typecheck and build passed. The full suites include the existing semantic/counterexample, text-golden and CLI checks. Personal opt-ins were disabled; empirical tests used only existing synthetic opt-ins and harness-owned recovery slots. New adapter tests assert exact cleanup and source/sentinel survival, including recovery of their deliberately injected residual case. Result limits do not certify bounded SQLite execution time.

Repository checks passed for **381 relative links across 41 Markdown documents**, all **20 WIN anchors**, the exact **10-file** change set, scanned private-value patterns and whitespace (including untracked files). Historical ADRs, personal preparation/observation records, helpers, package files and the five historical residual disclosures were preserved. Every proposed file was reviewed for attribution, synthetic scope and source/private-value handling. Nothing is staged.

### Earlier restricted-context attempt and cleanup uncertainty

An earlier ordinary run in the agent's restricted execution context returned **127 passed, 110 skipped and five failures**. The failures were existing, unchanged link/junction tests: scratch redirection; hard-linked selected files; tampered acquisition/analysis redirection; canary source hard links; and canary source-directory junctions. The same complete suite passed in the authorized ordinary-account context. This demonstrates context-sensitive results; sanitized failure names alone do not establish each underlying filesystem error or failure phase.

Cleanup for that failed attempt is **unconfirmed**. In particular, the two legacy canary link/junction tests attempt removal of the created link before cleaning their two fixtures; a link-creation failure can therefore interrupt both fixture cleanups. That creates a possibility of four residual invented fixture roots from those two tests, not a measured residual count. Other failed cases' exact cleanup outcomes are also not established by the retained sanitized results. The runner exited without retaining their exact locators. No broad temporary-storage search or cleanup was attempted, and no claim of complete cleanup is made for that attempt. These were invented fixtures, not personal copies or the real recovery slot. This disclosure is separate from, and does not rewrite, the five historical synthetic residual disclosures.

New adapter fixtures retain independent exact-run teardown authority. The legacy test teardown issue is recorded rather than silently changing existing tests in this slice. Independent review should consider this validation limitation; a later successful rerun does not remove earlier residuals.

No staging, commit, push, personal run or later gate is included. Independent review remains required before proposing actual personal-value access.
