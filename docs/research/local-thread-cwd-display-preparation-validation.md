# Local terminal thread/CWD display preparation

## Scope: design decision and synthetic implementation evidence

[ADR 0013](../decisions/0013-local-thread-cwd-display-preparation.md) authorizes recording the supplied [PMAP-001](personal-thread-cwd-observation.md) result and preparing a private alternate-screen viewer using invented sources only. Baseline is `b1449d80585b7b19d5ab7b072c3489e2e40138bc` plus this preparation change set. No personal execution, source/process inspection or real recovery-slot access is part of preparation.

The existing adapter/query/limits and managed helper remain unchanged. Summary-only MAP, CANARY/QUALIFY/RECOVER, original entries, product CLI and dependencies retain their behavior. A distinct fixed private display operation receives a one-use capability only after final source/acquisition verification, confirmed helper exit and authenticated scratch/recovery removal. Serialization and diagnostic inspection remain summary-only. Personal callers cannot supply hooks, arbitrary SQL, destinations or provenance.

The viewer preserves exact CWD grouping and opaque IDs, duplicate claims and ambiguity. It shows selected-table traversal/interpretation, omissions, unconsumed-column presence, source-local namespace, policy and enclosing interval. Values are reversibly ASCII-escaped before rendering; no stored control sequence, bidi character or hyperlink command is emitted raw. Wrapping preserves escape tokens and all values without truncation. Rendered pages are cached only in process memory for previous-page navigation.

Require a local TTY, supported alternate-screen indicator and at least 40x24 cells. The bounded viewport reserves a margin and restores terminal state on handled exits. Terminal indicators and simulated streams do not validate every real terminal's retention behavior. No files, clipboard, server or network output are introduced. No deliberate scrollback transcript is generated; external recording/capture, abrupt termination and secure memory erasure remain unproven.

## Validation

Invented unit cases cover one-use delivery, refusal gates, serialization/privacy, exact groups and duplicate IDs, partial/empty coverage, reversible escape representations, full long-value pagination, previous-page navigation, provenance, no stored-value-derived filesystem/network calls, noninteractive refusal and terminal restoration after EOF/cancellation/error/write/raw-mode/resize failures. Protected integration cases use standalone and existing WAL/SHM fixtures, injected closure observations and harness-owned slots. They verify final cleanup before delivery, source/acquisition instability, exit/cleanup uncertainty, unsupported schema/row overflow, refusal to deliver findings, exact recovery and unrelated sentinel survival. Faults must reach their intended phases.

Initial preparation, before the targeted independent review, measured on **7 October 2026** with Node **24.18.1**, libuv **1.52.1**, SQLite **3.53.1**, selected installed PowerShell **7.6.6** / .NET **10.0.12**, Windows `win32`/`x64`, release **10.0.26300**:

| Check | Passed | Skipped | Failed |
| --- | ---: | ---: | ---: |
| Targeted local display, explicit synthetic opt-in | 41 | 0 | 0 |
| Full explicit synthetic helper/canary suite | 315 | 0 | 0 |
| Ordinary suite, ordinary-account context | 177 | 138 | 0 |

The added cases comprise 31 ordinary tests and ten opted-in protected integration tests. Typecheck/build passed. Full explicit validation took approximately 162 seconds, including the existing timed lifetime/recovery tests. Existing semantic/counterexample, text-golden, CLI, adapter limits/authorizers, MAP attempt-boundary, CANARY/QUALIFY and recovery regressions remain included. Final current-run synthetic cleanup succeeded; deliberate failure cases use exact authenticated recovery plus independent harness teardown. No new personal acquisition/display occurred.

Repository checks passed for **428 relative links across 46 Markdown documents**, all **20 WIN anchors**, the exact **13-file** scope, private-value pattern checks, historical-record/behavior preservation and whitespace including untracked files. Nothing is staged. Independent review remains pending. Historical baselines remain **31 targeted MAP passes**, **274 explicit passes**, and **146 ordinary passes / 128 skips**, with no failures. No synthetic test establishes personal behavior or grants display permission.

### Four-blocker targeted review correction

The independent preparation review found four defects despite the initial passing tests. The correction is confined to the viewer's stream lifecycle, its synthetic harness and this record; escaping/wrapping/grouping, the adapter, coordinator, helper, recovery model, entries, attempt boundary, product CLI and dependencies retain their reviewed behavior.

1. Navigation checks readable-ended/destroyed/non-readable state before waiting and again after event registration, and listens for close as well as EOF. A lifetime error guard covers queued errors from already-destroyed input. EOF deterministically reaches restoration without polling. The regression covers already-ended, destroyed, pending-error and non-readable states with a short test-only termination deadline.
2. Teardown restores raw input promptly, awaits the exit/restoration write callback, and retains stream error guards through that completion and the current Node stream lifecycle queue before removing listeners. A real asynchronously completing/failing Writable regression proves the viewer does not settle early, returns only a sanitized handled failure on write error, and leaves no uncaught error or registered listener. This does not guarantee physical screen restoration after an output-device failure or arbitrary terminal behavior.
3. Test-only fixture teardown attempts owned scratch cleanup first. A residual, exception or inaccessible scratch identity preserves the fixture's recovery controls and prevents fixture-root retirement. Controls are removed only after scratch removal/absence is confirmed. The regression injects a residual, verifies key/record retention and an unrelated owned sentinel, then removes the injection and performs exact current-run teardown. Production recovery is unchanged.
4. All ten empirical callbacks share a protected fixture scope immediately after creation; the initial snapshot and every later fallible operation are inside its try/finally. A bounded ten-case snapshot-failure regression proves body dispatch is skipped and every exact fixture root is removed.

The four new regression tests use invented data and retain independent current-run teardown ownership. No personal state, real recovery slot or historical/unconfirmed residual is inspected, searched for or removed. The controlled residual injection is resolved within the same test-owned fixture; it is not a new lost-locator residual. The initial measurements above remain historical.

Post-correction validation on **7 October 2026**, with the same reviewed runtime context:

| Check | Passed | Skipped | Failed |
| --- | ---: | ---: | ---: |
| Four targeted blocker regressions | 4 | 0 | 0 |
| Targeted display suite, explicit synthetic opt-in | 45 | 0 | 0 |
| Full explicit synthetic suite | 319 | 0 | 0 |
| Ordinary suite | 181 | 138 | 0 |

Typecheck/build passed. The final explicit run took approximately 160 seconds. All **428 relative links / 46 Markdown documents**, **20 WIN anchors**, privacy/scope checks and whitespace checks passed. The correction edits only the viewer, display test file and this validation record; the wider 13-file preparation remains unstaged. PMAP-001, historical residual disclosures and the newer ten-root disclosure remain intact. No new unconfirmed residual was reported. Independent targeted re-review remains required; no staging, commit, push or personal execution follows.

### Delayed output destruction: targeted re-review correction

The targeted re-review found that the earlier queue-turn wait did not establish lifecycle completion: a restoration callback can fail before a Writable's asynchronous destruction emits its error. This correction supersedes only that completion claim in item 2 above. The prior measurements and the other four-blocker fixes remain preserved.

Restoration still awaits its write callback and restores raw mode promptly. A failed/errored output retains its error guard after the sanitized failed result returns. Node's stream completion notification retires the guard, with an additional closed-state check and error/close listeners covering `emitClose:false`, where stream completion can report failure before asynchronous destruction completes. No arbitrary delay, polling, end or destroy of caller-owned output is used as completion evidence. Normal long-lived output does not wait for terminal shutdown. A pending output lifecycle refuses another viewer run without adding listeners; owned listeners are removed when the lifecycle settles. If destruction never completes or notifies, failure stays handled and the guard remains owned rather than declaring completion.

The focused invented Writable regression holds asynchronous destruction beyond two test-only `setImmediate` turns, after the viewer has returned a sanitized failure. It proves prompt restoration, delayed error handling without a harness error listener masking the viewer guard, eventual listener cleanup, and no listener accumulation over three intervening viewer calls. Both enabled and disabled close notifications are exercised. The test turns reproduce the old removal point; explicit destruction release and actual stream notifications establish completion. The existing asynchronous-write regression now observes close instead of using a queue turn. Already-ended/EOF, recovery-control preservation and all ten snapshot-cleanup cases remain covered.

Final validation on **7 October 2026**, in the same reviewed runtime context:

| Check | Passed | Skipped | Failed |
| --- | ---: | ---: | ---: |
| Focused delayed-destruction regression | 1 | 0 | 0 |
| Four prior blocker regressions | 4 | 0 | 0 |
| Targeted display suite, explicit synthetic opt-in | 46 | 0 | 0 |
| Full explicit synthetic suite | 320 | 0 | 0 |
| Ordinary suite | 182 | 138 | 0 |

Typecheck/build passed. The final explicit run took approximately 163 seconds. All **428 relative links / 46 Markdown documents**, **20 WIN anchors**, privacy/scope and tracked/untracked whitespace checks passed. This correction changes only the viewer, display tests and this record; the wider 13-file preparation remains unstaged. No personal state, real recovery slot or historical residual was accessed; no residual search, staging, commit or push is included. No new unconfirmed residual was reported. The five historical residuals, restricted-context uncertainty, PMAP-001 and ten-root disclosure remain unchanged. Independent targeted re-review remains required before a personal execution proposal.

### Development residual disclosure

The first explicit targeted run (**26 passed / ten failed / zero skipped**) used new fixture basenames outside the existing SyntheticRun cleanup allowlist in its ten empirical cases. Each final fixture cleanup conservatively returned residual rather than deleting unknown entries. Consequently **ten synthetic fixture roots** were left unconfirmed when that test process exited, containing invented builder/source fixtures and ownership metadata. The exact locators were not retained. No personal data or personal recovery slot was involved. No filesystem search or cleanup of those lost-locator roots was attempted, and this record does not claim they were removed.

The fixture harness now reuses the existing allowed standalone names and retains independent exact-run cleanup for current tests, including deliberate failure/recovery cases. A corrected intermediate targeted run passed 36 tests with zero skips/failures. Later additions extend terminal/output-error and consent checks; final counts below supersede that intermediate measurement only.

Preserve the five older synthetic residual disclosures in the [canary preparation record](personal-canary-preparation-validation.md), and the separate restricted-context cleanup uncertainty in [adapter validation](thread-cwd-adapter-validation.md). This new disclosure does not revise or resolve them. No historical residual was searched for.

## Future authorization: proposed only

After independent review and a separately approved preparation commit, a fresh authorization must explicitly permit one acquisition plus **local display of actual record IDs and stored CWD strings**, source-local namespace and enclosing provenance interval. PMAP-001's consumed authorization cannot be reused.

Retain the same privately selected exact source, database-only or exact WAL/SHM pair after shutdown, rollback-journal refusal, ChatGPT,Codex local closure and browser allowance. Whole-file exposure remains 16 MiB/file, 32 MiB selected content and two protected copies. Scratch remains seven files/three directories/64 MiB plus 8 KiB; the fixed Local Application Data recovery slot retains its separate one-directory/two-file/16 KiB allowance and an existing slot blocks acquisition.

Allow only the existing main.threads/id/cwd queries, 1,000 traversed/interpreted rows plus one overflow detector, 16 KiB UTF-8 per field and 1 MiB cumulative encountered ID/CWD strings. No additional application values, filesystem access, discovery, Projects/worktrees, exports, persistence or uploads are permitted. Partial interpretation is explicit; unavailable/safety failure supplies no view.

Accept local visibility in an unrecorded compatible terminal, including the limits on external capture and terminal retention. Grant one conditional RECOVER attempt only for this new run's authenticated residuals. Confirmation alone remains unconsumed; the first consented source/recovery operation or helper startup consumes the acquisition regardless of later refusal or display outcome. No automatic retry; a consumed attempt needs fresh authorization. Closing the viewer never authorizes reacquisition.

## Minimal manual procedure after review and new approval

1. Verify the approved commit, clean checkout and successful build. Confirm the reviewed standalone runtime: Node 24.18.1, PowerShell 7.6.6, .NET 10.0.12. Query `[Environment]::Version` inside the selected PowerShell host; no SDK probe is needed. Desktop version alone is informational.
2. Use an unrecorded supported terminal at least 40x24 cells. Have the exact approved source privately available. Close local ChatGPT/Desktop normally and let Codex exit; keep them closed through completion and any authorized recovery. Browser chatgpt.com may remain open. Do not launch from an agent session or kill processes.
3. From the reviewed checkout:

   ```powershell
   $env:WORKSPACE_SURVEYOR_HELPER_PWSH = [Environment]::ProcessPath
   $env:WORKSPACE_SURVEYOR_PERSONAL_CANARY = '1'
   $env:WORKSPACE_SURVEYOR_PERSONAL_THREAD_CWD = '1'
   $env:WORKSPACE_SURVEYOR_PERSONAL_THREAD_CWD_DISPLAY = '1'
   node dist/test/support/personal-thread-cwd-display-entry.js
   $LASTEXITCODE
   ```

4. Enter the exact approved source visibly, review the derived temporary parent and fixed closure names, then type `AUTHORIZE ONE LOCAL MAP DISPLAY`. No source path enters arguments, shell history or selection files.
5. After acquisition and verified cleanup, use n/space for next, p for previous, q or Ctrl+C to close the alternate-screen viewer. Escaped values and continuation markers are representation, not normalized path data. The result reports display closed/refused/failed/unavailable separately from acquisition safety. A display failure never retries acquisition.
6. Bring back only the sanitized final JSON and exit code. Do not copy, photograph, record or send the input/viewer portion. Recovery is cleanup-only through the unchanged private RECOVER entry, once and only under the new conditional allowance; it cannot release findings.

## Completion and limits

Completion requires targeted, typecheck/build, ordinary and explicit synthetic validation, documentation/privacy/scope/whitespace checks and independent-review readiness. No personal run, staging, commit or push follows automatically. Human-readable stored claims do not establish visible chats, CWD meaning, filesystem identity, membership or full Desktop coverage. Additive unconsumed columns remain observations without a retained drift baseline. Schema/capability compatibility remains binding. A visual explorer, filesystem validation, persistence/export and all broader milestones require separate scope and approval.
