# Local read-only explorer and optional title previews

## Independent-review Unicode path correction, 2026-10-09

The reviewer reproduced a false relationship when unrestricted JavaScript lowercasing converted U+0130 into U+0069 U+0307. The existing Windows comparison key now folds only ASCII A–Z and preserves every non-ASCII code-point sequence. This intentionally may miss non-ASCII case equivalences; it does not normalize Unicode or claim filesystem identity. Drive/UNC syntax, supported extended prefixes, separator handling and raw display paths are unchanged. Root matching, Workspace connectivity and browser location grouping reuse this same function.

A synthetic regression reproduced the false cross-root matches before the fix. It covers drive and UNC paths, distinct components with and without Projects, raw-path preservation, and ASCII/extended-prefix equivalence within each Unicode case. Typecheck and build passed; all four focused path/Workspace checks passed. The full regression suite with all synthetic acquisition/helper opt-ins passed 504/504 tests, with zero failures or skips. The diff whitespace check passed. Prior real-browser user acceptance remains valid for its tested examples; no personal acquisition or source access occurred for this correction. Independent re-review remains pending; no commit or push occurred.

<a id="title-correction-2026-10-09"></a>
## Session-index title correction, 2026-10-09

**Founder-observed real run:** the first personal browser acquisition/display succeeded: 171 rows/claims, zero omissions or ambiguous IDs, 14 shortened SQLite titles, zero unavailable SQLite titles and Desktop registry decoding. The founder observed expected Project/Thread/CWD groups, 146 internal/archived diagnostic records, one dangling assignment and 39 stale projectless references. These are supplied outcomes, not a new independent run. A concrete exact-ID comparison showed an initial-prompt-like SQLite title where Desktop showed a short friendly name. Real acceptance is incomplete.

**Bounded local observation:** two metadata-only inspections of the nominated session index used retained Open/Read/FileShare.Read handles, a maximum 16 MiB in-memory copy, 10,000 records and 64 KiB per record, strict UTF-8 and before/after hashes through the same handle. Handles closed on every exit. No SQLite, transcript, source write, disk copy, recovery slot or unrelated file was opened. Only ID/name/timestamp fields were analyzed. The first PowerShell parser automatically converted timestamp strings into date objects; the second explicitly preserved their string representation. The user-supplied exact ID had two entries; the latest name matched the supplied Desktop title with no latest-time conflict. A name-selected second candidate also had two records and a matching latest name, but awaits exact-ID Desktop comparison. An older third ID was absent. Names, IDs, timestamps and personal source contents are not recorded here. This narrowly qualifies title enrichment for the compared ID, not index authority or UI visibility in general.

**Founder-supplied follow-up:** an independent metadata-only index test while Desktop was running reported 115 entries, zero malformed JSON lines, two entries for each of two compared IDs and newest-name matches against Desktop. A third exact ID was visibly present in Desktop but had no index entry. This confirms the missing-entry counterexample; index completeness must not affect existence or membership. Tests reproduce all three cases with invented IDs, names and timestamps, including seven fractional timestamp digits.

**Narrow missing-title investigation:** the nominated global-state file had no top-level title/name branch under the bounded metadata inspection; this does not claim an exhaustive search of nested state. The app's read-only thread-list metadata returned the exact missing-index ID with a raw title containing a Markdown skill link. Only the selected title field was inspected; conversation bodies and returned summaries were not inspected or emitted. Its inert link-label text matches the founder-supplied visible name. The shipping reader does not call this app API. SQLite fallback presentation now removes simple inline-link destinations as text formatting only, preserves the raw bounded title in collapsed details, and never follows embedded links. The copied SQLite value for that ID still needs confirmation in the next personal browser run; no source is guessed from a different ID, name or CWD.

**Implementation:** the existing protected browser acquisition optionally includes one `session_index.jsonl` source. Default selection is under the current home; `--session-index` is an invocation-only override. It shares the existing retained handles, source-set/hash verification, protected acquisition/analysis copies, authenticated recovery and cleanup-before-delivery. Byte limits remain 16 MiB/file, 32 MiB selected and 64 MiB plus 8 KiB scratch. The exact explorer inventory admits one additional nominated member (at most five sources, eleven scratch files); legacy canary counts and recovery records remain supported. No recovery redesign, new schema version, dependency or live SQLite reader is introduced.

Copied JSONL parsing is bounded to 10,000 records, 64 KiB/line, 4 KiB/name and 256 KiB of selected index titles. Only exact IDs already retained from SQLite can receive names. Chronologically greatest valid ISO timestamps win, including submillisecond precision and timezone equivalence. Equivalent duplicate names are harmless; conflicting names at the latest timestamp fall back to SQLite. An unorderable record for a known ID also falls back rather than guessing. A latest blank name falls back instead of resurrecting an older name. Invalid unrelated lines are counted without dropping valid enrichment. Whole-file encoding/record-limit failures disable enrichment; missing files fall back; source protection, acquisition size or integrity failures still refuse safely. Index-only IDs never create Threads or change classification, Projects, membership or CWD.

The UI shows the resolved name in records, search and Details. Headings compact whitespace and display at most 120 code points plus a preview marker. Details exposes title source, resolution and index timestamp, with bounded underlying title metadata collapsed. SQLite preview counters retain their original meaning; separate index coverage counters report enrichment, duplicate records, invalid records, conflicts and unmatched IDs. Registry Projects remain inferred, never automatically UI-confirmed. Generic component labels are unchanged.

**Synthetic residual disclosure:** the first targeted run caught a PowerShell array-expression defect and a missing fixture-cleanup allowlist member. Sixteen fixture-teardown failures across that run and one diagnostic rerun retained invented source trees containing the new index fixture; no personal data was involved. Locators were not retained and no residual search or broad cleanup was attempted. The expression and exact filename allowlist were corrected; the subsequent 177-test targeted run passed, including current-run cleanup and the five-source recovery case. Earlier residual disclosures remain intact.

**Validation:** typecheck/build passed. The actual invented-data browser showed the preferred index title in Workspace, search and Details, a compact SQLite fallback heading and collapsed technical metadata. Closing it reported source stability, helper exit, acquisition/recovery cleanup and fixture cleanup. The complete opt-in regression suite passed 499/499 tests with no skips; a subsequent focused 181/181 run also verified final-index writer rejection and acquisition-copy tamper detection. The final inline-link fallback follow-up is validated separately below. Independent review and corrected personal acceptance are pending.

**Next real comparison:** in standalone PowerShell, from the repository, run `npm run typecheck`, `npm run build`, then close Desktop normally and run `node .\dist\test\support\personal-explorer-entry.js`. Open the printed local URL; after the verified-cleanup message reopen Desktop. Compare the supplied exact-ID record, the second candidate and one other known current Thread by ID, friendly name, assignment and Copy working directory. Expect `session-index` / `latest` in Details when resolved. Confirm search finds the friendly names and ordinary headings contain no long initial-prompt blocks. Check registry-only Projects against actual visible Projects; keep them inferred if not checked. Test a Thread deeplink explicitly without sending a turn. Close the local session and report only sanitized match/mismatch/fallback counts. No deletion/migration experiment or new conversation turn is required.

**Final follow-up validation:** fresh typecheck/build and all 183 focused explorer/personal-explorer tests passed after the missing-index inline-link presentation correction. The earlier complete 499-test run predates that small presentation follow-up; no full-suite rerun is implied. Documentation validation checked 484 relative links/anchors across 53 tracked Markdown files with no missing targets. Whitespace and scoped private-example checks passed. No staging, commit or push occurred.

<a id="real-projectthread-slice-2026-10-09"></a>
## Real Project–Thread slice, 2026-10-09

**Authorization and evidence:** the founder approved implementation of the focused real-data slice, including bounded metadata access and a later protected real/UI comparison. This supersedes earlier JSON/Project exclusions for this entry only. Earlier procedures and validation below remain historical. No new ADR, dependency, discovery framework, migration or live reader is introduced.

The fixed reader consumes the observed `local-projects` (`id`, `name`, `rootPaths`), `thread-project-assignments` (`projectKind`, `projectId`) and `projectless-thread-ids` structures described in [state sources](state-sources.md). Fixtures use that shape with invented values. `threads.project_id` is not consulted. The existing protected DB+JSON profile is enabled for the personal entry through narrow gate changes; acquisition, handles, recovery inventory/deletion and browser protocol remain unchanged. ENOENT for the optional JSON disables Projects; malformed/incompatible copied JSON also disables Projects. Other protection, source or limit failures continue to refuse. Empty and Project-only snapshots now deliver.

Additional fixed projections read at most 4,097 encoded bytes of declared-TEXT `source` and only integer 0/1 from declared-INTEGER `archived`. Source previews over 4,096 bytes, undecodable or unknown values remain unclassified. Recognized source-origin tokens are `cli`, `vscode`, `exec`, `appServer`, `app-server`; these are candidate origin categories, not confirmed current Desktop visibility. A JSON object containing only a nonempty string or object `subagent` member is internal evidence; the precise current personal representation still needs comparison. Raw source JSON is not retained in the model or diagnostics. Titles retain their existing independent preview limits. Valid-ID Threads with missing CWD are retained.

Recognized internal and explicit archived records stay outside ordinary groups. Nonarchived, ordinary-origin, unambiguous rows require a valid Local Project assignment or explicit projectless marker to be inferred user-facing. Missing/unsupported classification, conflicting assignment/projectlessness and dangling/unsupported memberships stay in Unclassified. References without DB rows never create Threads. Registry Projects themselves are inferred; lack of inferred assigned Threads is not proof of emptiness. Windows comparison preserves original strings and matches supported ordinary/extended drive and UNC forms lexically; ambiguous/device/dot components stay exact-only. It does not inspect filesystem identity or infer membership. Workspace components use resolved assignments and comparable locations; internal/unknown records cannot bridge primary components.

### Standalone real comparison (pending)

Run the built `node dist/test/support/personal-explorer-entry.js` from an interactive standalone PowerShell terminal after closing Desktop normally. Defaults derive both named files under the current user home; optional `--source` and `--global-state` select exact paths for this invocation only. No repeated flags/phrases or settings persistence apply. After the verified-snapshot message confirms helper exit and copy cleanup, reopen Desktop beside the browser. Compare one multi-Thread Project, explicit projectlessness, an empty Project if present, extended-path correspondence, and observable internal/stale cases. Check titles, IDs, assignment and Copy working directory; do not send new turns or mutate organization. Record only sanitized match/mismatch/coverage outcomes, never private values or screenshots. No missing historical example is recreated. Close the local browser session to receive the final safety report.

The current Codex-hosted agent cannot close its own host and continue the UI comparison. This personal acquisition and current `source`/title/UI correspondence therefore remain pending the standalone handoff, not a claimed implementation pass. No personal acquisition, real recovery-slot access or historical residual search has occurred during implementation.

### Bounded open-app investigation

Two tests use only existing harness-owned builder files. An active WAL writer and separate read-only connection demonstrate a stable read transaction across a writer commit, followed by the new committed count in a later read. Reader-only intervals compare main/WAL/SHM bytes; SQL writes through the reader are refused. A second owned WAL copy lacking SHM demonstrates that a `readOnly` connection creates the SHM sidecar. This disproves treating that option alone as a source-nonmutation guarantee. No live personal SQLite probe follows and the production path stays closed-app. Broader live-acquisition engineering is deferred; it does not block this browser slice.

### Implementation validation

Typecheck and build passed. The complete ordinary regression run passed 308 tests with 172 explicitly gated skips; the complete opt-in synthetic run passed all 480 tests with no failures or skips. This includes source-integrity, recovery, Unicode/title bounds, browser security, classification, path comparison, actual-shaped registry and empty/Project-only delivery regressions. These results establish mechanics only, not personal-source compatibility or UI visibility.

After the complete run, a narrow provenance-prefix correction preserved legacy MAP/display naming while marking only invented explorer snapshots as synthetic. Fresh typecheck/build and the scoped personal MAP, local display and personal explorer suites passed all 137 tests with no failures or skips.

An actual browser session using invented data verified the default Workspace components, separate projectless group, inferred labels, collapsed Unclassified/Diagnostics, selection details, title search and Projects navigation. Closing the session removed the displayed dataset; the standalone runner reported verified source stability, helper exit, acquisition/recovery cleanup and fixture cleanup. No screenshot or dataset was persisted in the repository. A DOM regression separately checks empty Projects, safe Thread links and hidden internal/unknown records.

Review checked 482 relative documentation links/anchors across 53 tracked Markdown files, with no missing targets. The diff whitespace check passed, and added lines contained none of the supplied identifying example values. Personal acquisition/current Desktop comparison and independent review remain pending; no commit or push occurred.

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
