# PSQ-001: Personal schema qualification observation

## Provenance: founder-observed experiment

Reported by the founder on **7 October 2026** after one separately authorized standalone qualification. Exact execution time is unknown. The intended reviewed implementation was `dbac3cd0973c8bf35b68317447b0df5b82b3ecca`; the result does not attest the executing commit or runtime. No source or recovery slot was reopened to record this evidence, and cleanup was not independently re-inspected.

This observation is separate from [PCAN-001](personal-canary-observation.md), the historical WIN experiments and the [synthetic qualification preparation](personal-qualification-preparation-validation.md). The source was the privately selected database with its exact WAL and SHM companions. No private path, database basename, source-local identifier, content hash, copied schema/content or recovery material is retained here.

## Supplied sanitized result

```json
{"status":"passed","reason":"none","cleanup":"removed","recovery":"removed","files":3,"qualification":{"structure":"accepted","sample":"present","idText":true,"cwdText":true,"idNull":false,"cwdNull":false},"schemaReadable":true,"sourcesStable":true,"evidence":{"stages":["prepared","recovery-ready","held","copied","verified"],"phase":"release","fault":"none","partialWritten":false,"opened":3,"exitConfirmed":true,"diagnosticsDiscarded":false}}
```

**Qualification exit code: 0.** No separate recovery attempt was reported. `recovery: removed` reports removal of recovery controls, not execution of an independent RECOVER attempt.

The founder reported that `main.threads` matched the prepared candidate structure; `id` and `cwd` were accepted as ordinary declared-TEXT columns. One sample row was present, both fields had TEXT storage type, and neither was NULL. These are sanitized invariant conclusions, not a retained schema inventory. No actual ID or CWD string was returned.

Three source handles opened and three files were acquired, consistent with the selected database/WAL/SHM shape. Source stability, helper exit, scratch cleanup and recovery removal all reported success. The diagnostics flag is the runner's reported value, not proof about every possible diagnostic source.

## Preceding context, separately attributed

| Evidence | Observation and provenance |
| --- | --- |
| Desktop About | Founder-observed `26.1002.51308`, displaying release 6 October 2026 |
| Windows package | Bounded agent-executed identity check observed `OpenAI.Codex`, version `26.1002.6548.0` |
| Local process relationship | Bounded agent check observed 14 ChatGPT processes associated with that package and two Codex processes with ChatGPT direct parents; two distinct executable images |
| Exact-source revalidation | Founder reported seven matching handles, one Codex holder, no unexpected holder, database/WAL/SHM, no rollback journal, ordinary nonredirected files within approved bounds |
| Standalone runtime | Preceding confirmed context: Node 24.18.1, PowerShell 7.6.6, .NET 10.0.12 |
| Codex runtime revision / source mapping | Unknown |

About and package versions are separate observations. These versions and process counts are not measurements made by the qualification JSON. The approved closure list was `ChatGPT,Codex`, referring to local executables; a browser session on chatgpt.com was permitted to remain open.

Separate synthetic preparation results at the intended commit were **24 passed/0 skipped** targeted, **203 passed/0 skipped** full explicit, and **98 passed/105 skipped** ordinary, with no failures and typecheck/build passing. These validate implementation against invented data; they do not enlarge the personal observation's coverage.

## Procedural observations and design implications

**Founder-reported wrapper issue:** a temporary manual wrapper attempted `dotnet --version`, failed because no SDK was installed, and the qualification itself subsequently passed. This concerns wrapper/preflight design. The wrapper is not recovered or inspected here. No SDK installation or personal rerun is required. Future preflight should query `[Environment]::Version` inside the selected PowerShell host to measure the runtime actually hosting the managed helper, alongside that host's PowerShell version.

**Founder-reported process observation:** one apparently idle ChatGPT background process was visible after normal Desktop shutdown and before execution. Its timing relative to the runner's closure observations is unknown. Apparent idleness establishes neither writing nor nonwriting. The result reports passing the reviewed closure checks; neither this report nor the earlier process snapshot proves universal writer coverage. Preserve the closure checks and no-restart requirement.

## Limits and next authorization

The observed candidate structure and one row's storage types/nullness justify preparing the narrow adapter in [ADR 0011](../decisions/0011-thread-cwd-adapter-preparation.md). They do not establish ID uniqueness, validity of all rows, CWD meaning, visible-chat classification, membership, runtime location or filesystem identity. No actual record-to-CWD map has been reconstructed from personal data.

The one-run qualification authorization is consumed. Reported cleanup leaves no retained analysis copy. Any future actual ID/CWD read requires fresh explicit authorization after preparation and independent review. This observation authorizes no retry, personal inspection, real map, M2c, live acquisition or discovery. Atomic companions, transient writes, hostile races, crash cleanup and secure erasure remain unproven. All five historical synthetic residual disclosures remain unchanged and unrelated to this reported personal success.
