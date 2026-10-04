# Project Boundary research: WIN-018–WIN-020

## Provenance and limits

**Category: founder-observed evidence.** This is a separate boundary-research group, B1, not an extension of the original 2026-10-04 investigation baseline B0. WIN-001–WIN-017 remain in the [original record](windows-2026-10-04.md).

Source: [founder's project-boundary article](https://kassha.xyz/blog/git-metadata-vs-codex-project-boundary/), published 2026-08-22 and reviewed for this documentation on 2026-10-04. The article dates the controlled experiment to 2026-08-20–21 and the clean-workspace test to 2026-08-20. Exact historical audit dates are not established. Windows/PowerShell and Codex Desktop were reported; Desktop version, agent version, Windows build, and Git version are unknown. A model selection is not an application-version identifier.

Workspace Doctor has not independently reproduced any of these observations. No private artifacts were inspected. The original investigation's database/schema context does not apply to B1. The article also discusses documentation, source code, and issues; those discussions are not additional founder experiments or independently reviewed official evidence here. Official documentation reviewed directly for M0 is separately registered as [DOC-005 and DOC-006](evidence-catalog.md#doc-005-configurable-project-root-markers).

All identifying example names and values below are newly invented. No original paths, thread identifiers, prompts, response strings, screenshots, or marker values are copied. Generic `.git`, `.codex`, `.agents`, and AGENTS.md names describe the tested entry types. Tables record results in paraphrase rather than reproducing the probe text.

<a id="win-018"></a>
## WIN-018: Controlled project-boundary A/B/C/D experiment

**Founder-observed evidence:** on Windows, the founder used PowerShell and a fresh Codex thread for each phase on 2026-08-20–21. A parent AGENTS.md specified a distinctive response to a fixed probe. The synthetic reconstruction is `C:\Synthetic\boundary-lab\guidance-parent\child`, with CWD at `child` and the instruction file at `guidance-parent`. A higher empty `.git` existed above that parent at the start.

| Phase | Reported controlled marker state | Observed fresh-thread response, paraphrased |
| --- | --- | --- |
| A | Higher empty marker present; no child marker | Matched the parent-defined response |
| B | Empty child `.git` added; forced listing confirmed no contents | Acknowledged the probe instead of matching the parent-defined response |
| C | Child marker removed; higher marker retained | Matched the parent-defined response again |
| D | Higher marker also removed; no relevant marker remained | Returned the probe rather than the parent-defined response |

**Measurement and limits:** marker changes/listings and response outcomes were reported, not a direct observation of internal root selection or loaded instruction files. The A/B/C reversal supports a boundary interpretation but does not establish an instruction-loading trace. The exact effective marker configuration, trust state, discovery timing, and historical versions were not captured. The D result is consistent with CWD-only discovery fallback; it does not directly prove which internal root representation was used. A higher empty marker was not recognized by Git as a repository in the article's account; no universal Git-error classification follows.

**Design implication:** explain a nearer marker as evidence supporting a candidate discovery boundary only with qualified policy/context. Keep eligible, selected, observed loaded, and actually followed instruction claims separate. The response experiment cannot prove that every eligible file was loaded or every instruction followed. Root disagreement is informational, not a cleanup finding. The recorded marker manipulations are historical procedure, not actions Workspace Doctor recommends or executes.

**Revalidation/retirement direction:** separately authorized disposable experiments must record versions, effective policy, trust, CWD, fresh-run timing, marker states, response observations, and any direct discovery evidence. Narrow or replace build-specific boundary explanations if later evidence contradicts them; retain the A/B/C/D history. Do not equate a creation-behavior fix with an interpretation change.

<a id="win-019"></a>
## WIN-019: Historical marker presence differed from Git recognition

**Founder-observed evidence:** the article reports older Windows workspaces with empty-looking `.git`, `.codex`, and `.agents` entries; some entry groups shared creation timestamps. Filesystem inspection found an own `.git` while Git queries did not establish a repository root there. Exact audit dates, commands/environment details for each result, and historical versions are unknown.

**Measurement and limits:** entry existence/content/timestamps and Git-query outcomes were the evidence, not a proven creation trace. Repeated groups and matching timestamps do not identify the responsible process or code path. The audit did not itself establish Codex's boundary or instruction loading in every historical directory. A query failure requires context, not an automatic invalid-repository label.

**Design implication:** distinguish marker occurrence, qualified Git recognition, repository identity, metadata location, and origin. Neither an empty-looking entry nor absent root evidence proves safe deletion, abandonment, or ownership. Do not generalize the historical pattern into a claim that Codex always creates these entries.

**Revalidation/retirement direction:** separately authorized bounded research should record Git query method/outcome, directory and marker evidence, aliases, permissions, and policy/build context. Narrow artifact-origin hypotheses if direct evidence appears; replace any obsolete creation warning for a documented range without deleting this historical record or authorizing cleanup.

<a id="win-020"></a>
## WIN-020: Clean-workspace creation counterexample

**Founder-observed evidence:** a clean local Windows project tested on 2026-08-20 created and read ordinary files without producing `.git`, `.codex`, or `.agents` entries. This is a counterexample to treating the earlier directory-creation behavior as universal. Exact Desktop/agent/Windows versions and complete execution context are unknown.

**Measurement and limits:** the reported check concerned entry creation after ordinary file operations in that test. It did not test interpretation of an existing marker, establish a distributed-build fix, or verify every workflow. Source-code prevention discussed in the article is not proof of what the unknown tested build contained.

**Design implication:** marker creation and marker interpretation need independent evidence and applicability ranges. Preventing marker creation proves nothing about how existing markers are interpreted. The clean test does not retire boundary diagnostics or establish that older artifacts are safe to remove.

**Revalidation/retirement direction:** separately authorized creation tests must specify the workflow and build; existing-marker interpretation requires a distinct comparison. Retire or narrow a creation warning only for the validated range, and change boundary explanations only with interpretation evidence. Historical versions stay unknown.

See the [B1 compatibility matrix](../compatibility.md#boundary-context-b1), [future evidence sources](state-sources.md#future-bounded-boundary-evidence-design-direction), and [research questions](open-questions.md#q-16). These records authorize no experiments or scans.
