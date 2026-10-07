# PMAP-001: Personal private thread/CWD map observation

## Provenance: founder-observed experiment

Reported by the founder on **7 October 2026** after one separately authorized standalone private MAP. Exact execution time is unknown. The intended reviewed implementation was `b1449d80585b7b19d5ab7b072c3489e2e40138bc`; the result itself does not attest the executing commit or runtime. No source, processes or recovery slot were reopened to record this evidence. Cleanup was not independently re-inspected.

This experiment is separate from [PCAN-001](personal-canary-observation.md), [PSQ-001](personal-qualification-observation.md) and the [synthetic MAP preparation](personal-thread-cwd-preparation-validation.md). No private source path or basename, actual record/CWD value, hash, source/schema content or recovery material is retained here.

## Supplied sanitized result

```json
{"status":"passed","reason":"none","cleanup":"removed","recovery":"removed","files":3,"mapping":{"status":"ready","reason":"none","policy":"threads-id-cwd-v1","traversal":"complete-within-selected-table","interpretation":"complete-within-selected-table","rowsRead":139,"claims":139,"omittedRows":0,"ambiguousIds":0,"cwdGroups":15,"unconsumedColumns":true},"attemptConsumed":true,"schemaReadable":true,"sourcesStable":true,"evidence":{"stages":["prepared","recovery-ready","held","copied","verified"],"phase":"release","fault":"none","partialWritten":false,"opened":3,"exitConfirmed":true,"diagnosticsDiscarded":false}}
```

**MAP exit code: 0.** The authorized acquisition attempt is consumed; no rerun is authorized. No separate RECOVER attempt was reported. `recovery: removed` describes removal of recovery controls, not proof of a separate recovery invocation.

## Reported conclusions and limits

The result reports **139 traversed rows**, **139 retained claims**, **15 exact stored-CWD groups**, zero omissions and zero ambiguous IDs under `threads-id-cwd-v1`. Traversal and interpretation completed within the selected copied table. Three selected files and handles are consistent with the authorized database/WAL/SHM shape. Source stability, helper exit, scratch cleanup and recovery removal all report success. The diagnostics flag is the runner's report, not a guarantee about all external diagnostic sources.

Additional ordinary columns were unconsumed. Their presence is an observation, not a before/after schema comparison or proven drift. No schema inventory or actual ID/CWD strings were returned. Prior qualification and runtime observations remain separately attributed in PSQ-001; no new version, runtime revision or source mapping is inferred from this result.

Historical preparation measurements at the intended commit were **31** targeted passes, **274** explicit synthetic passes and **146** ordinary passes / **128** skips, with zero failures and passing typecheck/build. They are synthetic implementation evidence, not measurements made by this personal JSON.

The report supports construction of a bounded private record-to-stored-CWD map. It does not establish visible-chat coverage, CWD meaning, project membership, filesystem identity, path existence/equivalence, runtime location or complete Desktop history. Zero ambiguity describes this selected table's interpretation, not universal ID uniqueness across sources. Live acquisition, atomic companion consistency, hostile races, transient writes, crash cleanup and secure erasure remain unproven.

## Next boundary: design decision

Reported cleanup leaves no retained map or copy available for later display. [ADR 0013](../decisions/0013-local-thread-cwd-display-preparation.md) prepares a private terminal viewer using invented fixtures only. Any personal display needs a new acquisition authorization plus explicit permission to show actual values locally after independent review. No completed personal authorization can be reused, and no additional personal inspection follows from this record. Historical residual disclosures remain preserved and unrelated to this reported success.
