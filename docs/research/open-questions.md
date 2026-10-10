# Open questions and research gates

## Current answers and retained research gates

**2026-10-10:** the [accepted explorer](explorer-local-read-only-validation.md#accepted-milestone-2026-10-10) partially answers the questions below within nominated Windows sources and disposable fixtures. Dated answers narrow particular questions; they do not authorize another personal read or resolve broader lifecycle behavior. Original question text retains its planning context.

## Boundary

**Category: unknown** for the questions below. Outcomes and gates are design decisions. Listing a question does not authorize investigation. M0 uses public official sources, supplied observations, and synthetic examples only.

Private reads require specific authorization for target, purpose, data scope, and handling. State-changing experiments need separate authorization for their actions. Historical app/agent versions remain unknown unless contemporaneous evidence establishes them.

**M2a.1 narrowing — 2026-10-04 (design decision):** [ADR 0008](../decisions/0008-synthetic-acquisition-kernel.md) authorizes invented-fixture acquisition tests only. [Synthetic validation](synthetic-acquisition-validation.md) exercises bounded mechanics; native scratch protection refuses. Q-06/Q-07 are not resolved for real state: restrictive Windows ACLs, sharing exclusion and stronger zero-write evidence need separate scoped approval. Q-01–Q-05 and Q-08–Q-22 retain their research boundaries. Node SQLite fixture/analysis use does not select a real adapter or authorize dependencies/helpers.

<a id="q-01"></a>
## Q-01: Actual source shapes

**Dated answer, 2026-10-10:** Partially answered: ordinary selected threads and three nominated registry/assignment branches plus the exact-ID index shape are implemented and fixture-tested. Full schema fingerprints, future releases and effective source discovery remain unknown; see [source inventory](state-sources.md).

Which project/root/assignment and thread fields exist on the eventual target build? At M2, specifically authorized metadata-only inspection should produce a schema inventory, fingerprint, required-field list, and synthetic equivalent. Do not dump rows or conversation content. No source schema is validated by M0.

<a id="q-02"></a>
## Q-02: Record classification and UI coverage

**Dated answer, 2026-10-10:** Partially answered: qualified structured subagent/archive evidence and corroborated ordinary assignment/projectless metadata separate current versus internal/history. Visibility remains inferred; archived=0, index absence or missing edges are insufficient.

Which explicit discriminators identify user-visible, archived, internal, historical, and unknown records? Authorized limited comparisons should establish coverage and counterexamples. If no reliable discriminator exists, retain unknown classification. Null IDs, titles, missing CWDs, and absent spawn edges are insufficient.

<a id="q-03"></a>
## Q-03: Cross-source project correspondence

**Dated answer, 2026-10-10:** Narrowed by design: the current explorer consumes the observed global registry and its local assignments, not a join to SQLite Project IDs. It preserves disagreement/unknown states. General correspondence between distinct Project namespaces remains unestablished.

Which evidence connects global and SQLite project identities, especially duplicate/nested roots? Begin with synthetic ambiguity cases at M1; any real comparison needs M2 research authorization. Expected outcome: validated correspondence rules with explicit unresolved matches, not a join by ID alone.

<a id="q-04"></a>
## Q-04: Windows path comparison and physical identity

**Dated answer, 2026-10-10:** Partially answered: conservative lexical ASCII/qualified extended-prefix comparisons, Unicode distinctions, root-only lstat correction and reparse protections are covered by [discovery tests](../../test/discovery.test.ts). Physical aliases, 8.3 names, directory-specific case behavior and broader hosts remain unknown.

What supported primitives preserve extended namespace, case behavior, junctions, Unicode, 8.3 aliases, long paths, and accessible absence? Use disposable synthetic paths when path implementation is authorized. Expected outcome: bounded comparison policy and counterexamples; no whole-disk probing.

<a id="q-05"></a>
## Q-05: Host boundaries and future macOS support

What Windows-native, WSL, UNC, remote, and macOS assumptions must remain separate? [DOC-004](evidence-catalog.md#doc-004-native-windows-and-wsl-state) establishes documentation context only. Future host support needs independent source/path/lifecycle validation. Portable unit tests do not certify macOS product support.

<a id="q-06"></a>
## Q-06: Quiescent SQLite acquisition

**Dated answer, 2026-10-10:** Partially answered: protected closed-app copying, companions and source verification passed recorded fixtures and supplied personal runs. Read-only SHM creation and omitted-WAL tests demonstrate limits. No live/atomic or complete-writer guarantee follows.

Can isolated acquisition preserve committed WAL state and reject instability without touching original files or sidecars? Start with synthetic databases at the authorized implementation stage. Expected outcome: no-source-write tests, companion-file policy, instability behavior, and recovery refusal conditions. Reading a real database is separately authorized; opening it read-only is not sufficient proof of zero writes.

<a id="q-07"></a>
## Q-07: Private scratch storage

**Dated answer, 2026-10-10:** Partially answered by managed descriptor readback, retained sharing, authenticated exact-run cleanup and controlled recovery tests. Hostile races, alternate-account effective access, secure erasure and arbitrary crash/power-loss durability remain unproven; residual disclosures remain intact.

Can owner-restricted storage and verified Workspace Surveyor-only cleanup be established on supported Windows environments? Test only disposable Workspace Surveyor-owned synthetic storage when authorized. Expected outcome: permission verification, failure behavior, interruption/residual reporting, and cleanup containment. Do not promise secure erasure.

<a id="q-08"></a>
## Q-08: Effective state and worktree locations

Which Desktop settings determine effective homes, SQLite location, and worktree roots? [DOC-002](evidence-catalog.md#doc-002-worktree-roots-and-lifecycle) and [DOC-003](evidence-catalog.md#doc-003-state-location-configuration) motivate this question. Expected outcome: surface-specific discovery and overrides, multiple-candidate handling, and explicit coverage. Private configuration inspection requires authorization.

<a id="q-09"></a>
## Q-09: Migration bridge applicability

**Dated answer, 2026-10-10:** The handoff migration is the already recorded WIN-017, as explicitly confirmed by the founder. No additional independent success is counted. WIN-016 alone includes verified bridge removal; trigger, interruption and wider build applicability remain unknown.

Does the bridge still work on a documented target build, and what happens if verification fails or is interrupted? A specifically authorized disposable experiment should record assignment, runtime, persisted/copied CWD, removal, and re-audit separately. Stop on wrong runtime location. Do not test on existing personal threads by default.

<a id="q-10"></a>
## Q-10: Worktree ownership and lifecycle

**Dated answer, 2026-10-10:** Partially answered only for Git relationships in authentic fixtures. [WIN-021](explorer-local-read-only-validation.md#win-021) supplies bounded historical remnant/quarantine observations, not ownership or cleanup safety. Marker lifecycle, retention and restoration remain unknown.

Which evidence establishes Codex management and thread linkage? What do supported lifecycle operations retain, including ignored/untracked files? Begin with documentation and synthetic Git cases; real worktree reads/actions need appropriate authorization. Expected outcome: no inferred abandonment from absent chats and no generic folder-move advice for managed worktrees.

<a id="q-11"></a>
## Q-11: Supported integrations and side effects

Can supported APIs expose required membership and CWD information without starting a mutating process, repairing state, or disclosing conversation content? Review official App Server/plugin documentation first. Expected outcome: verified capability/side-effect assessment; no integration dependency until established. Do not assume tools available inside an agent chat are distributable public APIs.

<a id="q-12"></a>
## Q-12: Runtime and public contracts

**Dated answer, 2026-10-10:** Node 24 and built-in SQLite/TypeScript tests now support the private explorer path; no public API, stable serialization or published package is established. Earlier runtime measurements retain their dates, not universal compatibility.

Which Node version, SQLite driver, test tools, CLI conventions, and serialization are actually needed? Resolve only when M1/M2 needs them; prefer one small package. No version/driver/public API is established in M0. Driver selection must satisfy acquisition and resource constraints.

**M1 design resolution — 2026-10-04:** [ADR 0007](../decisions/0007-synthetic-cli-foundation.md) selects Node 24/npm 11, strict TypeScript, Node's built-in test runner, bundled scenarios, and text-only CLI conventions. This resolves the synthetic slice's tooling choices only. SQLite drivers, real acquisition, public APIs, and serialization remain deferred; no Codex schema or behavioral question is resolved by synthetic tests.

<a id="q-13"></a>
## Q-13: Visual comprehension

**Dated answer, 2026-10-10:** The founder accepted the light vertical relationship UI at the current milestone; disposable browser regressions cover desktop/narrow selection and Diagnostics. This qualifies the tested experience, not general usability across all datasets/users.

Can users understand assignment versus CWD, shared roots, nested projects, internal records, and coverage uncertainty in a focused visual view? Use a separately authorized synthetic prototype or M3 usability check. Expected outcome: inspectable evidence and useful navigation without a graph of every record.

<a id="q-14"></a>
## Q-14: Public release policy

Which license, security channel, supported-build statement, and distribution/signing process should the owner select? Resolve before M4 publication. Expected outcome: owner-approved release policy and complete content/history/artifact review. No license or private vulnerability-reporting availability is assumed today.

<a id="q-15"></a>
## Q-15: Assignment-reference cleanup timing and causality

When do assignment references disappear after thread deletion, and does Project removal cause that cleanup or merely precede the next observation? Would the references disappear later without Project removal? [WIN-007/008 supporting evidence](windows-2026-10-04.md#win-007) establishes only that references were seen after thread deletion and absent later after Project removal.

Only separately authorized disposable experiments may compare thread-deletion-only and Project-removal sequences with timed observations and source coverage. Record other activity and distinguish ordering from causation. Shared CWD must not be used to classify unrelated Guardian records as dependents of the deleted thread. No such experiment or private-state read is authorized by M0.

## Project Boundary research gates: beyond M1

The questions below concern WIN-018–WIN-020, separately from the original investigation. They require specific later research authorization; they do not expand M1 or block the initial synthetic CLI. Begin with public documentation, then propose bounded targets/fields and methods before any real reads or disposable experiments. No full configuration reads, AGENTS content inspection, arbitrary ancestry scans, or verification turns are authorized here.

<a id="q-16"></a>
### Q-16: Effective Desktop root-marker configuration

Which configuration layers actually determine Desktop's effective `project_root_markers`, and can relevant names/provenance be established without reading full private configuration? How should custom, disabled, absent, or unknown policy be reported? [DOC-005](evidence-catalog.md#doc-005-configurable-project-root-markers) documents a policy, not the historical or current local effective settings. Expected outcome: bounded evidence and explicit unknowns, not silent default assumptions.

<a id="q-17"></a>
### Q-17: Discovery timing and context

When does Desktop select/reselect its discovery boundary and instruction chain: run start, fresh thread, assignment, resumed turn, or other event? Which safe direct observations distinguish a discovered root from CWD-only fallback? [DOC-006](evidence-catalog.md#doc-006-project-instruction-discovery) does not independently verify Desktop timing. Expected outcome: contextual measurements without claiming a trigger from observation order.

How might retained session/context affect observed instruction behavior after a boundary or instruction-layout change? A future, separately authorized comparison should distinguish fresh runs/threads from resumed sessions and record prior context and change timing. Whether retained context explains a particular outcome remains unknown; do not infer rediscovery or a loading change from a response alone. This question does not authorize verification turns or change WIN-018's fresh-thread evidence.

<a id="q-18"></a>
### Q-18: Trust interactions

How do trust decisions affect boundary discovery, effective project-local settings, instruction eligibility/selection, and loading on the target Desktop build? Which decisions are independent? Expected outcome: qualified trust context and counterexamples, without interpreting a discovery boundary as an access-control or sandbox boundary.

<a id="q-19"></a>
### Q-19: Path aliases and boundary correspondence

How do junctions, symlinks, drive aliases, extended paths, case differences, and distinct lexical versus physical ancestry affect marker matching and Git/Codex root comparisons? Expected outcome: bounded alias evidence, no arbitrary ancestry scan, and no forced root equivalence or ownership inference.

<a id="q-20"></a>
### Q-20: Git-query interpretation

**Dated answer, 2026-10-10:** Standard reciprocal Git administrative relationships and conservative unresolved-marker boundaries are fixture-tested without runtime Git commands. Unsupported layouts and Codex boundary/instruction interpretation remain separate unknowns; see [DOC-025](evidence-catalog.md#doc-025-standard-git-administrative-relationships).

Which query/context establishes repository and worktree roots, repository association, and metadata location? How should bare repositories, worktree pointer files, inherited ancestor repositories, environment overrides, access failures, and other errors be qualified? Expected outcome: evidence requirements that separate absence of recognition from invalidity; no repair or script execution.

For submodule/worktree-related cases where `.git` may be a file rather than a normal repository directory, which bounded evidence distinguishes marker occurrence, metadata indirection, repository association, and Codex boundary interpretation on the target build? Future validation must consider entry type and query context separately. Interpretation and instruction-discovery effects in these cases remain open questions, not behavior established by the WIN observations or authorization to inspect real markers.

<a id="q-21"></a>
### Q-21: Evidence for instruction statuses

What evidence distinguishes eligible, selected, observed loaded, and actually followed instructions? Can loading be observed safely without contents/log disclosure or loader emulation? What does a probe response support, and what remains inferred? Expected outcome: contextual evidence thresholds and distinct reasons for exclusion above a boundary versus outside ancestry; no ancestry-only proof of loading or compliance.

<a id="q-22"></a>
### Q-22: Existing-marker behavior across builds

Do existing markers change interpretation across builds even when marker-creation behavior changes? How can separately authorized tests compare creation and interpretation with explicit build/policy/trust context? Expected outcome: independent applicability ranges and retirement decisions. WIN-020's nonrecurrence does not supersede WIN-018's interpretation observations or prove older artifacts safe to remove.

## Official documentation to recheck before implementation

**Design decision:** recheck App Server initialization/listing semantics and source coverage; Desktop project assignment/removal semantics; state-location configuration; worktree roots, retention, and restore behavior; deeplink availability; host permissions; and plugin local-execution limits. Begin with the [official-source records](evidence-catalog.md#official-documentation-records). If a source does not establish a fact, record it as unknown rather than implying support.

Before separately authorized boundary work, also recheck configurable root-marker policy, instruction discovery/selection, trust gating, and run timing. Documentation review alone does not reproduce founder experiments or certify Desktop behavior.

## Assumptions carried forward

| ID | Provisional premise | Consequence if false |
| --- | --- | --- |
| A-01 | CLI is practical for the first audience | Bring visual work forward with separate authorization |
| A-02 | Metadata is sufficient for useful explanations | Narrow claims before requesting broader access |
| A-03 | Validated metadata can approximate UI membership | Keep membership/visibility unknown where unsupported |
| A-04 | Quiescent private acquisition can meet safety requirements | Withhold real SQLite capability; retain partial/synthetic functionality |

These are assumptions, not evidence of Codex behavior.
