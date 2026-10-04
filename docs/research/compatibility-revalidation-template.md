# Compatibility revalidation record template

**Design guidance:** copy this structure into a new documentation record when a comparison is separately authorized. This is a documentation-only template, not a runtime schema, implemented capability, or permission to inspect private state or run an experiment.

Use synthetic identifying details only. Do not attach real state, personal paths, titles, identifiers, prompts, screenshots, or database/session copies. Mark missing context as `unknown`; do not backfill historical versions from the test installation. Preserve the original WIN evidence.

## Record and context

| Field | Entry |
| --- | --- |
| Revalidation record ID | To assign |
| Evidence category | Founder-observed experiment, official documentation, assumption, or unknown; keep design decisions separate below |
| Affected WIN IDs | To record |
| Affected proposed/implemented rule IDs | To record, or none |
| Affected workflow | To record, or none |
| Platform and execution environment | OS/build, native/WSL/remote context, or unknown |
| Desktop version | To record, or unknown |
| Agent version | To record, or unknown |
| Other relevant versions / schema context | To record, or unknown |
| Test date | Date of execution, or not tested; distinguish documentation access date |
| Documentation source and access date | If applicable; otherwise none |
| Authorization and bounded scope | What was authorized; omit identifying target details |

## Tested behavior and observed outcome

- **Behavior tested:** describe the specific claim and preconditions.
- **Procedure:** record the authorized steps using synthetic values.
- **Measurement method:** distinguish direct observations from inferred boundaries/loading. For boundary research, record effective-policy knowledge, trust/context, and whether the test concerns marker creation or existing-marker interpretation; keep those outcomes separate.
- **Observed outcome:** record actual results, including failed/interrupted steps; use `not tested` where appropriate.
- **Limitations / unknowns:** state source coverage, timing, confounders, and unverified claims.
- **Applicability range:** name only the tested platform/environment/version range. Record exclusions and unknown versions; do not extrapolate one result to every release.

## Comparison with prior evidence

Use one row per affected claim if outcomes differ. A proposed retirement is a design decision, not part of the observed result.

| Prior WIN / rule ID | Relationship to prior evidence | Basis and applicability |
| --- | --- | --- |
| To record | Reproduced, contradicted, superseded, or still unknown | To record |

## Rule or workflow decision: design decision

- **Disposition:** retain, narrow, retire, replace, or defer pending evidence.
- **Rule/workflow and applicability range:** to record.
- **Reason and replacement:** link the supporting record and replacement guidance, or state none.
- **Decision status / authority:** proposed or explicitly approved; record the decision reference.
- **Matrix update:** link the affected [compatibility rows](../compatibility.md) and this record; append results without rewriting the original B0 or separate boundary B1 history.

A Codex behavior fix does not reverse the direct-mutation prohibition. Any reversal requires an explicit superseding decision/ADR. Implementation and research authorization remain separate from this record.
