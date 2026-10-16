# M3a: Named-thread / Local Project explorer preparation

**Historical preparation record; navigation update, 2026-10-16:** use [Getting started](../getting-started.md) for current setup and launch. The founder-supplied [accepted baseline](../roadmap.md#current-position-and-priorities-2026-10-16) supersedes this record's pending/unavailable status where later qualified. The original profile, measurements, authorization gates and residual disclosures below remain intact; they do not establish new personal-run permission.

## Authorization and current evidence

The founder approves M3a implementation with invented fixtures, an explicitly synthetic Project format, and no personal source/recovery-slot access. [ADR 0014](../decisions/0014-named-threads-and-local-projects.md) records this boundary. [PLD-001](personal-local-display-observation.md) completes M2 private validation; all earlier records and residual disclosures remain historical and unchanged. No historical residual is searched for or claimed removed.

| Capability | Evidence | Current limit |
|---|---|---|
| ID / stored CWD | PSQ-001, PMAP-001, PLD-001 | Selected copied records, not UI visibility/runtime location |
| Stored title | Public OpenAI source hypothesis | Not personally qualified; no runtime revision mapping |
| Local Projects and assignment | WIN-001/004/006 | Current registry keys/types, location and correspondence unqualified |
| Exact location sharing/root match | Pure string derivation | Not physical identity or membership |
| Repository/worktree | Deferred | No stored path is inspected |

Public mapping pass, 2026-10-07: OpenAI's [threads migration](https://github.com/openai/codex/blob/main/codex-rs/state/migrations/0001_threads.sql) declares `title` alongside ID/CWD. This mutable public source is candidate evidence, not a mapping to the installed Desktop/runtime. Official [Projects documentation](https://learn.chatgpt.com/docs/projects) describes local projects with attached folders and a primary folder; it does not specify the private JSON registry serialization. Historical WIN-006 names `thread-project-assignments` but retains no current registry shape. No real Project keys are invented. Community issue reports do not establish a contract.

## Implemented preparation

Core modules under `src/explorer` have no canary/test imports. A bounded fixed SQLite reader inspects ordinary `main.threads`, projected column metadata excluding defaults, then ID/CWD/title (or the existing two-field projection when title is unavailable). At most 64 ordinary columns, 1,000 interpreted rows, a 1,001st overflow row, 16 KiB UTF-8 per field and 1 MiB cumulative encountered text across selected thread/Project fields. Bounds apply to results; they do not guarantee hard SQLite execution time or peak memory. Views, virtual/shadow objects, generated columns or incompatible ID/CWD refuse. Extra ordinary fields are ignored.

The invented Project format is explicitly marked `workspace-surveyor-invented-projects-v1`, with `projects:[{id,label,roots}]` and `assignments:[{threadId,projectId}]`. These are fixture keys, not proposed Desktop keys. Arrays preserve duplicate/conflicting claims. Limits are 1,000 Projects, 1,000 roots and 1,000 assignments, sharing field/text budgets. Whole-copy JSON parsing is bounded at 16 MiB; unrelated bytes enter parser memory but never become observations. Unknown JSON disables Projects only. The default real Project policy is unavailable and does not parse guessed structures.

The private synthetic bridge extends the existing retained-handle helper with a fixed DB+JSON profile and authenticated v2 recovery inventory. Existing CANARY/QUALIFY/RECOVER/MAP/TUI entries, two-field adapter, CLI and dependency files are preserved. The expanded helper path accepts synthetic mode only; no personal explorer entry exists. This is not general native acquisition.

The browser has Projects/Locations tabs, title/location search, record details and visible source/coverage/ambiguity. Shared CWDs across Projects remain shared. Missing assignment is labeled no assignment observed, not projectless. Dangling reference counts describe resolution in the retained claim graph; references to omitted rows may also be unresolved and do not establish source-record deletion. Differences from assigned roots are described as string differences, never physical mismatch. Missing/empty labels use Untitled record / Unnamed Project. No ID/CWD normalization, stored-path following or organization action occurs.

## Synthetic demonstration

From a built checkout, use the selected installed PowerShell host, without personal opt-ins:

```powershell
$env:WORKSPACE_SURVEYOR_HELPER_PWSH = [Environment]::ProcessPath
$env:WORKSPACE_SURVEYOR_RUN_CANARY_PREPARATION = '1'
$env:WORKSPACE_SURVEYOR_RUN_EXPLORER_PREPARATION = '1'
node dist/test/support/explorer-entry.js
```

This creates invented sources only, acquires verified protected copies, removes scratch/recovery and the current fixture before opening the local server, then prints one ephemeral local session URL. Open it manually. Close the page session or use Ctrl+C; ten-minute expiry also closes the server. No browser is launched, no file is exported and no personal source path is accepted. No real recovery slot is accessed. The browser receives values only via the session-scoped channel; static HTML contains none. Browser memory, screenshots/history/extensions/external capture are outside secure-erasure guarantees.

<a id="future-qualification"></a>
## Smallest future qualification requirement

One exact, explicitly selected `.codex-global-state.json` would be copied together with the already-selected database and permitted companions. Its effective location is not established here; no default-home discovery is authorized. Current approved acquisition permissions are consumed and do not cover this JSON file, titles or browser delivery.

Before that run, nominate the finite registry key(s) from a founder-supplied sanitized structural description or official evidence. The only already historically named assignment candidate is `thread-project-assignments`. Do not enumerate all top-level state keys to guess the registry. If no registry target can be nominated, keep Projects unavailable and prepare a titled-location-only personal scope instead.

For nominated targets, qualify only:

- Container types, whether identities are keys or explicit fields, and exact allowlisted field names/types for Project identity, optional label and declared root(s).
- Assignment container/reference types, multiplicity, and whether absence/null has explicit unassigned meaning. Until proven, no assignment observed remains the label.
- How references address source-local SQLite IDs and distinguish ambiguous/dangling records. Matching strings alone cannot resolve duplicates.
- Structural coverage/limits and qualification of the selected source role; no arbitrary alternative-key search.

Keys/types suffice to choose a fixed decoder. Dynamic identity keys, labels, roots and assignment values stay private; qualification output need not reproduce them. Actual title/Project/root/assignment reads and local browser display then need separate explicit permission in the same useful end-to-end run. Whole-file copying/parsing exposes unrelated bytes; only the nominated allowlist becomes observations. No unrelated value query, schema SQL, defaults, prompts, transcripts, logs, credentials, filesystem inspection or extra tables. A small founder comparison with already-known Desktop titles/assignments would qualify semantics without universal UI-coverage claims.

## Validation

**Synthetic development residual disclosure, 2026-10-07:** the first explicit M3a descriptor-fault test returned residual because the helper correctly refused the deliberately damaged scratch DACL. Its original harness teardown also refused, and that test process ended without a surviving locator in this session. One invented fixture root, its scratch and recovery controls therefore remain unconfirmed; no personal source was involved. No search/removal is attempted or claimed. The subsequent harness correction uses independently owned exact scratch cleanup only for this deliberate descriptor fault after confirmed helper exit, and retires controls only after confirmed scratch absence. All earlier five residuals, the restricted-context uncertainty and the ten unconfirmed terminal-viewer fixture-root disclosures remain unchanged in their original records.

Historical baselines remain 320 explicit passes and 182 ordinary passes/138 skips. New tests cover named-thread capability, synthetic Project claims, exact reconciliation, hostile text rendering, loopback session isolation and protected JSON acquisition/recovery. No synthetic test certifies real Desktop Project behavior.

Final measurements on 2026-10-07, against baseline `e1f6f3fd1534537a7b9a179bae4a5781e86e8318` plus this working tree:

| Check | Pass / skip / fail |
|---|---|
| Targeted new explorer suite, explicit synthetic opt-in | 38 / 0 / 0 |
| Full ordinary suite | 210 / 148 / 0 |
| Full explicit synthetic suite | 358 / 0 / 0 |
| Typecheck / build | Passed |

Full suites ran sequential test files in the ordinary account outside the agent sandbox, without elevation. The agent sandbox initially denied the new loopback request test. Personal opt-ins were not enabled. Selected helper was the running installed PowerShell host (7.6.6 / .NET 10.0.12); Node was 24.18.1, libuv 1.52.1, embedded SQLite 3.53.1, Windows x64 release 10.0.26300. These are runtime observations, not Desktop source/runtime mappings.

An initial ordinary run caught a widened legacy recovery-acknowledgment bound. The correction preserves the old maximum and permits the expanded range only after authenticating the v2 explorer inventory. Final full results above include the unchanged existing semantic/counterexample, golden, CLI, P1/P2 and viewer regressions. The initial new-suite failures and the descriptor residual above are not erased by later passes.

Browser verification used invented data only: Locations, Projects, title search, individual record details, exact-root-versus-assignment explanation and explicit session closure were checked through a new local tab. The session exited successfully, and the temporary browser tab was closed. No screenshot or dataset file was saved to the repository. DOM tests exercise text-only rendering of hostile strings and unavailable Project data; HTTP tests verify token/host/origin rejection, no-store delivery and closure. Controlled writer-on-final-JSON failure opened the prior three streams but released no destination content or findings. JSON instability, destination-descriptor/partial-copy/protocol failure, final acquisition-copy changes, cleanup failure and disposal uncertainty all withhold delivery; current-run authenticated recovery preserves source sentinels.

Documentation checks passed for 452 relative links across 49 Markdown documents and all 20 WIN anchors. Privacy/scope review covered the 19-file change set, including every untracked file. No scanned private-value patterns, generated/private source artifacts or trailing whitespace were found; `git diff --check` passed. Existing personal entries, two-field adapter, terminal renderer, CLI, package/dependencies and the three historical residual-bearing records match the committed baseline. No real Codex state, processes or recovery slot were inspected; no historical residual was searched for. Nothing is staged, committed or pushed. Independent review remains required.

## Targeted shutdown correction, 2026-10-08

Independent review found two P2 shutdown races, with no P0/P1 findings: a pending browser snapshot could repopulate a closed view, and a signal received before the entry owned a server close callback could be forgotten. The original measurements above remain historical.

The browser now latches closure before aborting its snapshot request and clearing the view. Both response and JSON-decoding continuations check that terminal state before accepting data; late failures cannot replace the closed status. Pagehide uses the same local cancellation, and stale navigation/details callbacks cannot restore cleared data. The authenticated close request uses no snapshot abort signal.

The private synthetic entry now retains SIGINT/SIGTERM cancellation independently of server creation. Acquisition is allowed to finish its existing safe lifecycle; cancellation discards its snapshot and prevents delivery. Cancellation during pending server startup awaits startup settlement, takes ownership of the resulting server, closes it and publishes no URL. Repeated signals share one close operation. Final cleanup awaits server closure and fixture teardown before removing signal listeners; teardown uncertainty retains sanitized residual reporting. No acquisition, helper, adapter, recovery, personal-action or authorization behavior is changed.

Fourteen deterministic regressions use controlled promises, fake signal events and invented in-memory data. Browser responses deliberately ignore abort to prove terminal-state guards at both response and decoding boundaries, for success and failure. Entry cases exercise both signals during acquisition/startup, pre-delivery teardown cancellation, repeated signals, rejected startup, normal completion and teardown failure. Assertions cover snapshot disposal, withheld URLs, awaited cleanup and listener removal. These tests use no sleeps, polling, real process signals, personal sources or real recovery controls.

Validation after integration on 2026-10-08:

| Check | Pass / skip / fail |
|---|---|
| Targeted shutdown regressions | 14 / 0 / 0 |
| Targeted explorer suite, explicit synthetic opt-in | 52 / 0 / 0 |
| Full ordinary suite | 224 / 148 / 0 |
| Full explicit synthetic suite | 372 / 0 / 0 |
| Typecheck / build | Passed |

The full explicit suite ran once after integration and took approximately 374 seconds. Ordinary-account execution outside the agent sandbox was used for the existing owned-object DACL and loopback tests, without elevation or personal opt-ins. Runtime observations remained Node 24.18.1, libuv 1.52.1, PowerShell 7.6.6, .NET 10.0.12 and Windows x64 release 10.0.26300. Checks passed for 452 relative links across 49 Markdown documents, all 20 WIN anchors, privacy/scope, tracked/untracked whitespace and `git diff --check`. No new unconfirmed residual was reported; controlled synthetic fault cleanup remains distinct from historical residuals. Nothing is staged, committed or pushed, and no personal state or real recovery slot was accessed.

Only `src/explorer/view.ts`, `test/support/explorer-entry.ts`, `test/explorer.test.ts` and this record are changed by this correction within the existing 19-file M3a preparation. PLD-001, all earlier historical records and every residual disclosure above remain intact. No historical residual is searched for or claimed removed. Targeted independent re-review of these fixes remains required; personal use remains separately unauthorized.

## Additional shutdown lifecycle correction, 2026-10-08

Targeted re-review confirmed both original P2 race fixes, but found two additional P2 issues (pagehide did not attempt server closure; cancellation hid acquisition safety evidence) and one P3 issue (signals during final teardown could still return success). The previous results remain historical; this correction preserves their terminal-state and startup-cancellation guards.

Pagehide now invokes the same idempotent close operation as the Close button. That operation first irreversibly clears local state and aborts snapshot loading, then sends an empty authenticated POST using `fetch` with `keepalive: true`. The session token remains solely in the existing header; the server's host/origin/token requirements are unchanged. [Browser API documentation](https://developer.mozilla.org/en-US/docs/Web/API/Request/keepalive) supports keepalive for page-exit requests with custom request properties. This is best effort, not guaranteed delivery or guaranteed pagehide dispatch; the unchanged ten-minute server expiry remains the fallback. There is no beacon/token-in-URL fallback, retry loop or new persistence mechanism.

The entry retains the acquisition coordinator's typed, sanitized safety result unchanged, including cleanup, recovery, disposal evidence and any attempt classification supplied by that result. Cancellation does not replace it with null or rewrite it after fixture cleanup. If no result was returned, safety remains null rather than fabricated. A single final report separates `cancelled` and entry status/reason from `safety` and `fixtureCleanup` (`beforeDelivery` and `final`, each not-run/removed/residual). A successful fixture teardown cannot revise an earlier acquisition residual report. Cancellation remains an unsuccessful entry outcome; acquisition is still allowed to complete its existing safe lifecycle.

The shutdown sequence was inspected end to end: retain acquisition result, check cancellation, perform pre-delivery fixture teardown, recheck cancellation, await server startup and assume its ownership, recheck before publishing the URL, await closure, discard the local capability, await owned server closure and final fixture teardown. Signal handlers remain installed through all awaited cleanup. Only after cleanup settles are listeners removed and the final cancellation/status decision, sanitized report and return made synchronously, with no intervening await. Thus a signal during final teardown or its promise resolution cannot escape the final decision. No acquisition or attempt-consumption behavior changes.

Deterministic regression additions cover authenticated pagehide requests, rejected and undelivered closure with real server expiry advanced by a mocked clock, cancellation retaining non-null residual/recovery evidence despite either successful or residual fixture teardown, both signals during final teardown, uncancelled successful final teardown, and cancellation at final teardown promise resolution. Existing late-response, repeated-close, acquisition/startup-cancellation, normal-completion and listener-ownership regressions remain. No sleeps, polling, real process signals or personal fixtures are used by these new tests.

Validation for this additional correction, completed on 2026-10-08:

| Check | Pass / skip / fail |
|---|---|
| Focused shutdown regressions | 22 / 0 / 0 |
| Complete targeted explorer suite, explicit synthetic opt-in | 60 / 0 / 0 |
| Full ordinary suite | 232 / 148 / 0 |
| Full explicit synthetic suite | 380 / 0 / 0 |
| Typecheck / build | Passed |

The usage-limit interruption occurred after implementation, focused/targeted/ordinary validation and typecheck/build had completed. Resumption inspected and preserved those edits and execution results; no further code or test edits were necessary. The remaining full explicit synthetic suite then passed in approximately 287 seconds, and this record was completed with the actual results. The focused shutdown suite expanded from 14 to 22 cases; all earlier late-response and startup-cancellation regressions remain passing. Empirical synthetic and loopback tests ran in the ordinary account outside sandbox restrictions, without elevation or personal opt-ins.

Final repository checks passed for 452 relative links across 49 Markdown documents, all 20 WIN anchors, privacy/scope patterns, tracked/untracked whitespace and `git diff --check`. The wider M3a preparation still contains 19 changed files with nothing staged. No new unconfirmed residual was reported. No personal state, real recovery slot or historical residual was accessed; no residual search, commit or push occurred.

Only the browser view, private synthetic entry, explorer tests and this preparation record are changed by this correction. The server protocol/expiry, acquisition/helper/recovery code, adapter, personal actions and authorization scope are unchanged. Historical disclosures, including the unconfirmed M3a descriptor-fault fixture and the earlier ten-root disclosure, remain intact; none is searched for or claimed removed. Targeted re-review remains required.

## Completion boundary

This delivers synthetic-tested explorer preparation and review readiness. Real Project decoding and real-browser semantics are pending. M3a's real-product completion requires a later separately authorized useful run and founder comparison, not another UUID-only canary. No personal execution, staging, commit or push follows preparation automatically. Git/worktree enrichment, full discovery, persistence/export and organization actions remain later independent scope.
