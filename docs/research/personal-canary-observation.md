# PCAN-001: Personal closed-app canary observation

## Provenance: founder-observed experiment

Reported by the founder on **2026-10-06** after one separately authorized standalone run. Exact execution time is unknown. Workspace Surveyor has not independently reopened the source, inspected the recovery slot or verified cleanup after this report. The intended reviewed implementation was commit `44453cd`; the supplied result does not attest the executing commit or runtime versions.

The founder reported the selected shape as **one database plus its exact WAL and SHM companions**. The source was privately selected using founder-observed Desktop runtime file handles. The closure list was `ChatGPT,Codex`. No source path, database basename, record identifier, content hash, source contents or recovery locator is retained here.

This is a separate personal-acquisition observation, not an addition to the historical WIN-001–WIN-020 experiments and not synthetic evidence. See [ADR 0009](../decisions/0009-personal-closed-app-canary.md) and the preserved [preparation record](personal-canary-preparation-validation.md).

## Supplied result

The following is the founder-supplied sanitized result, not an independently reproduced execution:

```json
{"status":"passed","reason":"none","cleanup":"removed","recovery":"removed","files":3,"schemaReadable":true,"sourcesStable":true,"evidence":{"stages":["prepared","recovery-ready","held","copied","verified"],"phase":"release","fault":"none","partialWritten":false,"opened":3,"exitConfirmed":true,"diagnosticsDiscarded":false}}
```

The founder reported **exit code 0** and **no recovery required**.

The result reports three opened source handles, successful protected copying and schema-only readability, successful source-stability checks, confirmed helper exit, and removal of scratch and recovery controls. `recovery: "removed"` reports removal of the controls; it does not mean a separate RECOVER attempt was needed. `diagnosticsDiscarded: false` is the reported runner flag, not proof about every possible diagnostic source.

## Runtime qualification: separate synthetic measurement

Before this personal run, the existing suite was rerun at `44453cd` with the explicitly selected installed **PowerShell 7.6.6 / .NET 10.0.12** host. Node remained **24.18.1** (libuv **1.52.1**). The agent's bundled PowerShell was still on the earlier patch and was not selected as the empirical helper host.

| Check | Result |
| --- | --- |
| Full explicit synthetic suite | 179 passed, 0 skipped, 0 failed |
| Ordinary opt-out suite | 79 passed, 100 skipped, 0 failed |
| Typecheck and build | Passed |
| Whitespace and working tree | `git diff --check` passed; clean at `44453cd` |

No code change or downgrade was required. These are synthetic qualification results for the runtime substitution, not personal-source observations. The earlier PowerShell 7.6.5 / .NET 10.0.11 preparation measurements remain historical evidence. No personal source or real recovery slot was inspected during runtime qualification.

## Preceding version observations: founder supplied

| Surface | Observation |
| --- | --- |
| Desktop About version | `26.930.61225` |
| Release date displayed in About | 5 October 2026 |
| Windows package version | `26.930.7945.0` |
| Codex runtime revision / source mapping | Unknown |

These are preceding, changeable observations, not versions independently measured by the canary result. Do not equate the About version with the package version, infer a runtime revision, or backfill historical WIN evidence.

## Interpretation and remaining limits

The report supports one successful execution of the bounded acquisition/readability/cleanup path for the selected three-file shape. SQLite inspection was limited to the two fixed preparation probes; no application metadata query or schema qualification is established. Source stability is the runner's observed identity/metadata/content verification, not process-attributed proof of no transient writes or incidental operating-system metadata changes.

It does not prove atomic database/WAL/SHM consistency, live-app safety, complete writer coverage, source-schema compatibility, record semantics, other-account access, hostile-race protection, crash cleanup, power-loss durability or secure erasure. Cleanup is reported successful, not independently re-inspected. The five synthetic development residual disclosures in the preparation record remain unchanged and unrelated to this personal run.

## Next authorization: design decision

The one-run personal authorization is consumed. Reported cleanup leaves no retained analysis copy to reuse. A bounded schema/metadata qualification therefore requires synthetic preparation and independent review, followed by a fresh, precisely scoped personal-run authorization. No acquisition retry, personal inspection, adapter, general native acquisition or M2b/M2c follows from this observation.
