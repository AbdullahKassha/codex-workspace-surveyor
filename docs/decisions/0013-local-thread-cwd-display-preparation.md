# ADR 0013: Private local terminal map display preparation

- Date: 2026-10-07.
- Status: accepted for synthetic preparation only; independent review and fresh read-and-display authorization precede personal use.
- Category: design decision supplementing [ADR 0012](0012-personal-thread-cwd-map-preparation.md), following [PMAP-001](../research/personal-thread-cwd-observation.md).

## Delivery and consent

Prepare a fixed private display operation and dedicated standalone entry, outside the product CLI. Reuse the unchanged two-field adapter, queries, limits, managed helper, source checks, exact recovery and cleanup. Existing summary-only MAP, CANARY, QUALIFY and RECOVER keep their behavior. There is no personal callback, arbitrary SQL or output destination.

Personal display requires the two existing opt-ins plus `WORKSPACE_SURVEYOR_PERSONAL_THREAD_CWD_DISPLAY=1`, actual-value consent, separate display consent and `AUTHORIZE ONE LOCAL MAP DISPLAY`. These controls do not grant execution permission. Preparation uses invented sources, injected closure observations and harness-owned recovery slots only.

Only successful final source/acquisition verification, helper exit and authenticated scratch/recovery removal permit a one-use private capability. It carries the existing claims/groups/provenance in memory; JSON and diagnostic inspection expose only summaries. The renderer takes it once and drops references on exit. Failed safety or adapter checks release no capability. Later recovery cannot release withheld findings. The reviewed attemptConsumed boundary is unchanged; closing or failing the viewer after acquisition does not restore the attempt.

## Exact strings and presentation

Group by exact stored CWD using the existing adapter groups in first-observed order. Display every accepted opaque record ID, including duplicate claims and ambiguity markers. No normalization, case folding, filesystem access, path following, alternative fields or record classification is added.

Present source-local namespace, policy and the interval enclosing acquisition through cleanup. Repeat selected-table coverage, omissions, ambiguity, group counts and the unconsumed-column observation. Explain that these are stored claims with unverified meaning and paths. Versions remain informational provenance; schema invariants and acquisition capabilities determine acceptance. Extra ordinary columns are ignored within the existing bound and are not called proven drift.

Use a reversible quoted ASCII representation: escape backslashes, quotes and all non-printable-ASCII UTF-16 code units as escapes. Preserve surrogate units, invisible/bidirectional characters and case/Unicode differences in the underlying strings. Only renderer-owned control sequences enter the terminal. Wrap between complete escape tokens, label continuation lines, and paginate without truncation. Controls are next, previous and quit only.

## Local terminal and retention

Require an interactive alternate-screen-compatible terminal, indicated by Windows Terminal's session variable or the finite supported TERM families. Require at least 40 columns / 24 rows; bound the viewport to 240 columns / 100 rows, reserve a right margin and stop if it becomes smaller during navigation. An environment indicator is a compatibility assumption, not independent verification of every terminal implementation. Redirected/unsupported output refuses before personal startup.

The viewer creates no files, server, network output, clipboard action or deliberate scrollback transcript. Terminal recording, screenshots, external capture, terminal retention and abrupt-exit restoration cannot be guaranteed. Use an unrecorded standalone terminal and accept local visibility only through later explicit consent. Restore the alternate screen, cursor and previous input mode on normal exit and handled failures. Rendered-page caches remain process memory; result bounds do not promise hard peak-memory or execution-time limits or secure erasure.

Derive temporary and recovery locations through existing runtime/OS mechanisms; never embed a personal username. Prompt only for the previously authorized exact source and read-and-display confirmation. Closure names remain ChatGPT,Codex, referring to local Desktop/runtime; the browser may remain open.

## Completion boundary

See [display preparation validation and future procedure](../research/local-thread-cwd-display-preparation-validation.md). Independent review precedes fresh personal read-and-display permission. PMAP-001 consumed its summary-only authorization and retained no reusable map. No personal run, real recovery-slot access, historical residual search, persistence/export, Projects, worktrees, visual explorer, discovery, product/public interface, dependency, M2c, staging, commit or push is authorized by this preparation.
