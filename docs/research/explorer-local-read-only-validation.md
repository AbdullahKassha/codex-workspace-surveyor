# Local read-only explorer and optional title previews

## Scope and preceding failed attempt

The founder requested this corrective implementation on 2026-10-08, under [ADR 0016](../decisions/0016-local-read-only-explorer-and-title-previews.md). Baseline: `92741f9939fa4b13ec0ed0bed5b8159cc9c7cab5`. This is synthetic implementation evidence. No personal source, real recovery slot, real preferences or historical residual was inspected. Earlier [preparation](personal-explorer-preparation-validation.md), [PLD-001](personal-local-display-observation.md) and all residual disclosures remain historical and unchanged.

The founder reported one real browser attempt refused with top-level `acquisition`, safety `limit`, exit 1, `attemptConsumed: true`, three opened handles, stages prepared/recovery-ready/held/copied/verified, release phase, no injected fault or discarded diagnostics, and reported scratch/recovery removal. No browser was delivered. Exact execution time and exceeded limit are unknown. Do not attribute that refusal to titles, reconstruct a dataset or treat these changes as evidence that personal browser use now succeeds. No recovery or repeat personal acquisition was performed during this correction.

## Current local launch behavior

After focused independent review, use a standalone PowerShell 7 terminal with local ChatGPT Desktop/Codex normally closed, from the built checkout:

```powershell
npm run build
node dist/test/support/personal-explorer-entry.js

# Optional exact override; synthetic example
node dist/test/support/personal-explorer-entry.js --source 'C:\Synthetic\Codex\state_5.sqlite'
```

There are no personal opt-in flags or typed authorization phrases for this entry. Launching requests one read-only inspection and local browser display. The default is derived with `join(os.homedir(), '.codex', 'state_5.sqlite')`; one `--source <absolute-local-database-path>` overrides it for this invocation only. No source prompt or saved selection exists. The default is a convention, not proof of effective storage. Missing/incompatible sources refuse without choosing a replacement. Malformed arguments and the removed `--change-source` option refuse before acquisition. No source discovery, automatic retry or background run occurs. Keep Desktop closed until entry completion, including any necessary explicit recovery.

The standard installed PowerShell host is derived from `ProgramFiles/PowerShell/7/pwsh.exe`; a nonstandard installation can be selected through the existing `WORKSPACE_SURVEYOR_HELPER_PWSH` variable. No PATH or filesystem search is performed. Node 24 is required; patch versions are provenance, and unavailable APIs fail through existing capability checks. The measured synthetic baseline remains Node 24.18.1, PowerShell 7.6.6/.NET 10.0.12. No broader runtime compatibility claim is made.

**Settings removal, 2026-10-09:** no preferences file, registry value, temporary settings artifact or settings IPC is used. Existing settings are not inspected, migrated or removed. The source is shown locally through safe escaping, but never included in sanitized result reports. An explicit override is a command argument and may appear in shell history; it is not hidden input.

The existing recovery slot stays separate. A pre-existing or uncertain recovery run blocks acquisition; launch does not recover it automatically. Recovery remains an explicit cleanup-only action through the existing RECOVER entry with its legacy gate. Authentication/lifetime uncertainty refuses; no search, permission repair or automatic retry is added. Subsequent user-initiated explorer launches do not require fresh one-attempt permission. `attemptConsumed` describes whether the consented acquisition operation started and has no authorization-expiry effect here.

After protected copying, source/acquisition verification, helper exit and authenticated cleanup, the entry prints one ephemeral loopback URL. Open it locally, use Locations/search/details, then Close local session or Ctrl+C. Projects stay explicitly unavailable. Page-exit closure remains best effort; ten-minute expiry is the fallback. Cancellation awaits safe acquisition cleanup and prevents further delivery. No browser dataset persistence/export/upload is added; browser-memory erasure is not guaranteed.

## Reader policy and diagnostic accuracy

The same ordinary `main.threads` and exact declared-TEXT ID/CWD policy remains. The schema queries remain fixed. Accepted declared-TEXT title enables only this bounded projection:

```sql
SELECT id, cwd,
       CASE WHEN typeof(title) = 'text'
            THEN substr(CAST(title AS BLOB), 1, 4100)
            ELSE NULL END AS title
FROM main.threads LIMIT 1001;
```

Only the fixed `typeof`/`substr` functions are authorized for row reading. A separate exact, read-only `PRAGMA main.encoding;` qualifies the analysis connection's text encoding, including WAL state, before decoding BLOB bytes. Its authorizer permits only that encoding read. UTF-8, UTF-16LE and UTF-16BE are supported; an unknown result disables title decoding. No additional application fields, replacement columns, defaults, schema SQL, tables or JSON are inspected. SQLite documents that TEXT-to-BLOB conversion uses the database connection encoding; invented databases verify that behavior independently for all three encodings. [SQLite CAST documentation](https://www.sqlite.org/lang_expr.html#cast_expressions)

Blob projection preserves embedded NULs. Fatal decoding checks the bounded bytes, including four lookahead bytes, and never retries after dropping invalid bytes. Only an incomplete sequence at the far lookahead edge may be buffered; it is outside displayed content. Retained text stops at a complete character within both 4 KiB encoded and UTF-8 limits. Lookahead is never displayed. Bytes beyond the fetched prefix are not inspected or certified. Shortened labels are marked `[shortened]`; malformed/unavailable labels are marked `[title unavailable]`. Coverage reports shortened and unavailable retained-label counts independently of structural title acceptance. The optional aggregate preview allowance is 256 KiB. No record is omitted merely because its optional title exceeds a display budget.

Required ID/CWD text retains 16 KiB per field, 1 MiB cumulative encountered text including omitted rows, and 1,000 traversed rows plus overflow detection. Any required-limit violation withholds the entire dataset. The SQLite record ceiling is 16 MiB, matching acquired-file bounds and allowing bounded title projection from larger records; required Node field limits are unchanged. Source corruption remains a refusal. Limits bound data/results, not SQL execution time or secure memory erasure.

Failures distinguish `reader-rows`, `reader-id-bytes`, `reader-cwd-bytes`, `reader-required-text`, `source-file-bytes`, `source-total-bytes` and scratch/control limits. No field value, record identity, measured private size, path, hash or raw diagnostic is emitted. A separate failure stage distinguishes source selection, copy validation, analysis and source verification from helper progress. Explorer results retain copied-file counts, accepted schema evidence and completed final source-stability evidence even if analysis refuses; these are independent observations, not released findings. Cleanup/recovery outcomes remain separate. Legacy personal action results keep their previous success-gated behavior.

## Initial synthetic validation before targeted review

Measured on 2026-10-08 using Node 24.18.1, PowerShell 7.6.6 and .NET 10.0.12 on Windows. Results are synthetic implementation evidence, not a successful personal browser observation.

| Check | Passed | Skipped | Failed |
|---|---:|---:|---:|
| Targeted explorer and personal-explorer suites, explicit synthetic opt-ins | 132 | 0 | 0 |
| Final-build focused title and limit regressions | 13 | 0 | 0 |
| Ordinary complete suite | 282 | 170 | 0 |
| Explicit synthetic complete suite | 452 | 0 | 0 |

Typecheck and build passed. The final focused rerun followed a diagnostic-only correction identifying analysis/acquisition files as scratch when checking their byte limits. The complete suites had already passed; this correction changes the reported subtype, not thresholds or acquisition behavior. Documentation validation passed for 480 relative links across 53 Markdown documents and all 20 WIN anchors. Privacy/scope, tracked and untracked whitespace, and `git diff --check` passed. The 18-file change set is unstaged; 16 checked legacy/historical files and the helper's existing acquisition/recovery body remain unchanged.

Tests cover multi-megabyte and normal titles, Unicode/NUL/BOM/boundary previews, aggregate optional-title fallback, required fields/cumulative text, row overflow, malformed analysis, sanitized subtypes, preserved safety evidence, source-byte fault injection, first/reused/changed selection, persistence refusal, cancellation, protected synthetic preferences, tampered settings/entries/redirection and existing shutdown/recovery regressions. All settings and recovery tests substitute harness-owned locations. No real personal entry is invoked. An initial targeted run encountered sandbox loopback restrictions; the approved ordinary-account rerun and full suites passed. This slice reported no new cleanup residual; it neither inspected nor removed historical residuals.

The initial review scope included the explicit-launch boundary, private source-path persistence, fixed title projection and resource bounds, truthful safety diagnostics, and cleanup/cancellation ownership. This preparation does not run or silently retry the consumed historical attempt.

## Four-blocker correction, 2026-10-08

Independent review reproduced settings hard-link overwrite, non-atomic replacement, incorrect UTF-16 title decoding and malformed UTF-8 removal at a preview boundary. The correction is limited to settings persistence, title decoding, their synthetic tests and this decision/validation documentation. The existing local launch, remembered selection, source/acquisition protections, required-data limits and browser delivery gates remain intact.

The settings tests create an additional hard link and require both names' bytes and identity to remain unchanged after rejected load/update. Injected partial temporary-write and immediately-pre-replacement failures must report their exact allowlisted reached phase and preserve/reload the prior valid record. A cleanup-failure injection retains the owned temporary file and reports uncertainty; the independent harness then removes that exact test artifact. Successful replacement must change file identity, reload the new selection and leave only `source.json`; unrelated sentinels survive. Windows replacement uses the supported managed API, with a true null backup argument rather than PowerShell's empty-string coercion. No fallback copy-over operation is used. [File.Replace documentation](https://learn.microsoft.com/en-us/dotnet/api/system.io.file.replace?view=net-10.0)

Title tests construct UTF-8, UTF-16LE and UTF-16BE databases and assert actual TEXT-to-BLOB byte conversion before reader assertions. Tests cover normal and long labels, encoded/UTF-8 boundaries, invalid bytes before/at/after the preview boundary, overlong sequences, surrogate encodings, bad continuations and truncated input. Valid two-, three- and four-byte UTF-8 sequences crossing the boundary shorten without corruption. Required ID/CWD relationships remain exact and their existing resource refusals are retained. An initial header-only encoding check proved insufficient for a WAL-only initialized fixture; the final check uses SQLite's active analysis-connection encoding instead of parsing WAL or broadening schema discovery.

Final integrated results on the same Windows/runtime baseline:

| Check | Passed | Skipped | Failed |
|---|---:|---:|---:|
| Focused four-blocker regressions, including standalone/WAL acquisition | 29 | 0 | 0 |
| Complete targeted explorer suites | 159 | 0 | 0 |
| Ordinary complete suite | 304 | 175 | 0 |
| Explicit synthetic complete suite | 479 | 0 | 0 |

Typecheck/build passed. The ordinary and explicit full suites each ran once after integration. Final documentation validation passed for 480 relative links across 53 Markdown documents and all 20 WIN anchors. Privacy/scope and tracked/untracked whitespace checks, including `git diff --check`, passed. The existing 18-file change set remains unstaged; this repair edits eight of those files. Sixteen checked legacy/historical files are unchanged. Outside the new preference branch, the helper adds only a reporting guard so a sharing exception cannot overwrite an already detected preference-cleanup residual; acquisition/recovery operations are unchanged.

All fixtures, settings and recovery controls in these tests are harness-owned. The deliberately injected temporary-file residual was removed by its exact independent test owner; no new unconfirmed residual was reported. No personal state, actual settings, real recovery slot or historical residual was inspected. Nothing was staged, committed or pushed. Targeted independent re-review is the next boundary.

## Settings-removal correction, 2026-10-09

A subsequent independent review reproduced two additional P2 races in the former settings transaction: temporary identity/content could change after validation but before commit; pathname-based failure cleanup could delete a substitute and misreport the original artifact as removed. Prior passing tests did not establish race safety. The founder revised the requirement to a derived default and invocation-only override. The implementation removes settings storage and its transaction protocol entirely, preserving the title encoding/preview corrections, required-data limits and acquisition/browser behavior. No old settings or residuals are inspected or cleaned.

Validated on 2026-10-09 with Node 24.18.1/libuv 1.52.1, PowerShell 7.6.6 and .NET 10.0.12, Windows x64. Earlier test totals and residual disclosures above remain historical.

| Check | Passed | Skipped | Failed |
|---|---:|---:|---:|
| Targeted source-selection/title/encoding/limit tests, explicit synthetic opt-ins | 72 | 0 | 0 |
| Ordinary complete suite | 299 | 167 | 0 |
| Explicit synthetic complete suite | 466 | 0 | 0 |

Typecheck/build passed. Each complete suite ran once after integration. Removed preference and prompt tests account for the changed totals; tests now cover spaces/Unicode in an invented home, unchanged invocation-only overrides, malformed/duplicate/removed flags, cancellation, selection without filesystem IO/helper startup, and missing synthetic-default refusal without helper startup or alternative selection. Existing title/encoding, limit, shutdown, source-preservation and recovery regressions pass.

Documentation validation passed for 480 relative links across 53 Markdown documents and all 20 WIN observations across the two historical research groups. Privacy/scope, tracked/untracked whitespace and `git diff --check` passed. Seventeen checked legacy/helper/adapter/browser-lifecycle/product/historical files remain unchanged. The managed helper is now identical to the committed baseline: its uncommitted preferences branch and associated reporting guard are removed. The full outstanding preparation contains 17 changed/new files, with nothing staged.

No personal sources, actual settings, real recovery slot or historical residuals were accessed. Tests used owned synthetic sources/recovery stores only; no new unconfirmed residual was reported. No settings migration or cleanup was performed. Nothing was staged, committed or pushed. Targeted independent re-review should examine the absence of preferences operations, fixed default/override selection, preflight cancellation and retained reader/diagnostic behavior. Real title semantics and Project decoding remain unqualified; this is not a successful personal browser observation.
