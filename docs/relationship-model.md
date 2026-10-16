# Conceptual relationship model

**Current applicability, 2026-10-16:** the founder-supplied accepted baseline `2a12ecf9fa757b6f1a32adec60892620f06acee3` retains the identity, membership, path and evidence distinctions below. Session reuse and presentation changes add no membership inference or instruction-loading proof. Dated implementation subsets describe their own checkpoints; see [compatibility](compatibility.md) for current support and [Getting started](getting-started.md) for use.

## Instruction Discovery Scope supplement, 2026-10-12

The approved conditional metadata slice adds optional memory-only `instructionScope` evidence to the Explorer snapshot. It retains exact entry checks (purpose, state/type, instruction-file size where ordinary, and target/ancestor obstruction), ordered stored-CWD ancestry with entry references, stopping reason, conditional boundary coverage, observation interval and separate work limits. Effective policy is explicitly unknown; the only interpretation assumes the documented `.git` policy under DOC-005/DOC-006.

Only qualifying Workspace CWDs nominate checks. Ordinary `.git` occurrence does not depend on Git identity. Completed negative checks in every nearer directory support a candidate; a gap withholds it. Absence at a checked target differs from failure to reach that target. Candidate coverage does not establish file selection or effective Codex root selection. Observations create no entities, relation edges or components; stored assignment/projectlessness, visibility, physical/Git relationships and numbered placement are retained. Original raw stored relations remain available. Configuration, fallback names, global guidance and loaded instructions remain unobserved. See [validation](research/explorer-local-read-only-validation.md#instruction-scope-2026-10-12).

## Implemented relationship subset, 2026-10-10

The [accepted explorer](research/explorer-local-read-only-validation.md#accepted-milestone-2026-10-10) keeps Project registry identity, stored assignment, explicit projectlessness, stored CWD, physical existence, containment and Git common identity separate. Project membership requires qualified assignment evidence; matching CWD/root paths can connect a Workspace component without establishing membership. Shared broad ancestors never union components. Source folders are roles of deduplicated locations, not additional physical objects.

Qualified ordinary, nonarchived assigned/projectless records appear in Workspace with inferred visibility. Structured subagent and archived records remain Diagnostics; unresolved ordinary records need review. Titles, absent index entries, null project IDs and missing spawn edges do not determine these roles.

Folder observations retain exact-path state independently of enumeration coverage, including outside-scope roots. Existing folders inside a verified nearest Git tree receive lexical location evidence, not tracked-file or Project-membership claims. Reciprocal standard administrative metadata supports main/linked common identity. A nearer unresolved/unsupported marker blocks fallback to an ancestor repository, including descendant CWDs. Git identity is not inferred from remote URLs, names or proximity. Ordinary directory observations stay internal without inventory UI.

[Regression coverage](../test/discovery.test.ts) and [reconciliation tests](../test/explorer.test.ts) validate this subset. The conceptual relationships below also include future capabilities; runtime CWD observations, spawn edges, effective Codex boundaries and instruction loading are not reconstructed by this implementation.

## Contextual relationship explanations, 2026-10-12

**Approved presentation-only subset:** existing membership, stored relations, qualified coverage and bounded Git observations now supply concise explanations in Details. Stored assignment establishes the displayed Local Project association; explicit projectlessness remains distinct from missing assignment or unavailable qualification. Matching/sharing a folder explains co-location without establishing membership. A differing stored CWD preserves its Project assignment and is compared against all declared Source folders; an empty root list supplies no mismatch claim. Folder Details distinguishes Projects declaring a Source folder from qualifying Threads reporting that stored working directory.

Verified metadata explains common repository associations; lexical `inside-git-tree` evidence explains location without file tracking, ownership or membership claims. Unsupported, missing and inaccessible metadata remains unverified with its existing detailed state. Git Details leaves the effective Codex discovery boundary unknown. The internal nearest-marker barrier is a conservative Git-association rule, not an observation of Codex root selection. No marker inventory, policy reader or AGENTS.md discovery is added. The future distinctions below remain governed by [WIN-018–WIN-020](research/project-boundary-observations.md), [DOC-005/DOC-006](research/evidence-catalog.md#doc-005-configurable-project-root-markers) and [DOC-025](research/evidence-catalog.md#doc-025-standard-git-administrative-relationships); no evidence IDs or historical compatibility limits change.

See [validation](research/explorer-local-read-only-validation.md#project-boundary-explanations-2026-10-12). These explanations do not alter the snapshot schema, components, path comparison, discovery or acquisition.

## Vocabulary: design decisions

These terms define product language, not runtime classes or a public schema.

| Term | Meaning | Must not imply |
| --- | --- | --- |
| Local Project | App-level identity associated with reported local roots | Ownership of every file or chat under a folder |
| Thread / chat | Conversation identity with reported metadata and execution history | Visible UI status merely because a database row exists |
| Stored CWD | Directory path persisted in a state source | Current runtime location or successful migration |
| UI-reported CWD | Directory reported by a UI action at a recorded time | Stored or runtime CWD at an unmeasured time |
| Runtime CWD | Location established by an actual execution observation | Something that a metadata-only scanner can independently prove |
| Directory | Filesystem location, path aliases, and inspection status | A project or repository by itself |
| Source folder | A directory's role in a relationship | A separate physical object |
| Repository | Git repository identity determined by validated inspection | Identity determined by its remote URL alone |
| Worktree | Checkout linked to Git registration and repository | Codex-managed ownership inferred only from location |
| Session / rollout | Persisted conversation artifact | Content to parse by default |
| Internal record | Explicitly identified internal metadata | Garbage or a removable orphan |
| Unclassified record | Metadata whose role is not established | A user-visible thread or an internal record by guesswork |
| Historical metadata | A reference whose present role is not established | Corruption |

## Evidence-bearing relationships: design decisions

Potential relationships include project declares root, thread is assigned to project, thread reports stored CWD, verified execution reports runtime CWD, directory is nested within another, worktree occupies directory, worktree belongs to repository, and record references/spawned from record.

Record source, time, applicable platform/version context, evidence reference, and uncertainty for each claim. Keep active, historical, conflicting, unresolved, and not-observed relationships distinct. Define exact runtime representations later.

Do not join different project identifier namespaces by string equality. Matching normalized roots supports correspondence but does not automatically merge project identities. Do not infer UI membership from null SQLite `project_id`, nearest ancestor root, title, or folder name. Preserve differing sources for comparison ([WIN-004](research/windows-2026-10-04.md#win-004) through [WIN-006](research/windows-2026-10-04.md#win-006)).

Multiple threads can report the same directory; parent and child directories can each be project roots. Neither is inherently inconsistent. A missing spawn edge does not prove that a record is independent or corrupt.

## Project Boundary distinctions: design decisions

These concepts extend the vocabulary for separately authorized future diagnostics. They do not introduce runtime classes, schemas, IDs, or public APIs. Coinciding paths do not make the concepts synonymous.

| Concept | Meaning and evidence requirements | Distinction to preserve |
| --- | --- | --- |
| Local Project root | App-level root reported for a Local Project | Does not establish the Codex filesystem discovery boundary |
| Thread CWD | Stored, UI-reported, and runtime observations, each with source and time | Preserve disagreements and measurement order; one observation does not substitute for another |
| Codex filesystem project boundary | Root selected or inferred for a particular discovery context | Distinguish directly observed selection from inference; an actual discovered root differs from CWD-only fallback, even at the same path |
| Root-marker policy | Relevant configured marker names and whether effective configuration is known | Unknown policy is not a verified default; configuration layers and disabled parent search may matter |
| Root-marker occurrence | A filesystem entry that may satisfy a marker policy | Presence does not prove Git validity, repository identity, origin, or creation mechanism |
| Git repository root | Root supported by qualified Git evidence, including query context and outcome | Root location, repository identity, and metadata location are separate; errors do not automatically mean invalid repository |
| Git worktree root | Checkout/worktree location with an evidenced repository association | May coincide with another root without becoming synonymous; metadata may reside elsewhere |
| Project instruction discovery scope | Eligible ancestry path and selected instruction files for a context, with exclusion reasons and uncertainty | Does not establish that an instruction was loaded or followed; global guidance is a separate scope |

Potential evidence-bearing relationships include policy may match occurrence, occurrence supports candidate boundary, discovery context reports selected boundary or CWD-only fallback, Git query reports root, worktree associates with repository, instruction file lies on eligible ancestry, and instruction file is selected or excluded with a reason. Record evidence, timing, effective-policy knowledge, and alternative explanations. Do not infer a boundary from app membership or a `.git` name alone.

## Instruction evidence: design decisions

| Status | Required distinction |
| --- | --- |
| Eligible | Within the applicable discovery path under evidenced boundary/policy conditions; eligibility may be conditional or unknown |
| Selected | Chosen under applicable selection rules; mere presence/ancestry is insufficient |
| Observed loaded | Supported by a qualified observation of loading for that run/context; selection is not proof |
| Actually followed | Supported by a specific behavioral observation; loading does not guarantee compliance, and one response does not prove all instructions were followed |

For project-scoped discovery, an ancestor above the effective boundary is excluded because discovery starts below it. A sibling outside the CWD ancestry path is excluded for a different reason: it is not on that path. Global guidance remains a separate scope. Unknown boundaries require conditional explanations, not definite exclusions. Filesystem ancestry alone proves neither observed loading nor actual following; do not reconstruct the loader from ancestry alone.

**Official documentation context:** [DOC-005](research/evidence-catalog.md#doc-005-configurable-project-root-markers) and [DOC-006](research/evidence-catalog.md#doc-006-project-instruction-discovery) record reviewed discovery/selection documentation separately. **Founder evidence:** [WIN-018](research/project-boundary-observations.md#win-018) inferred a boundary effect through controlled fresh-thread responses, without directly inspecting the loader. Preserve that distinction.

A project discovery boundary is not a sandbox boundary, access-control boundary, or file-ownership boundary. These diagnostics explain evidence; they do not authorize marker, configuration, instruction, or Git changes.

## Synthetic example

All values below are invented and are not a source export:

| Entity | Reported relationship |
| --- | --- |
| `synthetic-global-project-alpha` | Root `C:\Synthetic\atlas` |
| `synthetic-sqlite-project-beta` | Reports the same root |
| `synthetic-thread-alpha` | Assigned to the global project; stored CWD `C:\Synthetic\atlas\drafts` |
| `synthetic-thread-beta` | Membership unknown; same stored CWD |

**Design interpretation:** preserve both project records until correspondence is established. Describe assignment and stored CWD separately. The subdirectory and shared CWD do not prove a defect. Unknown membership is not projectlessness.

### Synthetic Project Boundary example

**Illustrative design scenario:** every path, marker name, and relationship below is invented, not an observation of Codex. The layout intentionally scopes one task to a tools subtree inside a repository organized under a broader Local Project. For this example only, effective policy includes the invented marker name `synthetic.boundary`; boundary selection and qualified Git-root evidence are stipulated, not inferred from file presence.

| Concept | Synthetic location |
| --- | --- |
| Local Project root | `C:\Synthetic\atlas` |
| Git repository root | `C:\Synthetic\atlas\repo` |
| Codex filesystem project boundary | `C:\Synthetic\atlas\repo\tools`, with the configured marker occurrence `synthetic.boundary` |
| Thread CWD | `C:\Synthetic\atlas\repo\tools\src`; stored, UI-reported, and runtime observations are stipulated to agree at their respective example check times |

The eligible project instruction ancestry is **tools → src**. Here, applicable means within that discovery scope; it does not mean selected, observed loaded, or actually followed.

| Synthetic instruction location | Scope explanation |
| --- | --- |
| `C:\Synthetic\atlas\repo\tools\AGENTS.md` | Eligible boundary-level candidate |
| `C:\Synthetic\atlas\repo\tools\src\AGENTS.md` | Eligible CWD-level candidate |
| `C:\Synthetic\atlas\AGENTS.md` and `C:\Synthetic\atlas\repo\AGENTS.md` | Ancestors excluded from project-scoped discovery because they lie above the stipulated boundary |
| `C:\Synthetic\atlas\repo\tools\tests\AGENTS.md` | Sibling excluded because it lies outside the CWD ancestry path |

**Design interpretation:** all four roots differ intentionally; divergence alone is not erroneous and calls for no repair. Eligible files may still be empty, displaced by selection precedence, or limited by the guidance size budget; see [DOC-006](research/evidence-catalog.md#doc-006-project-instruction-discovery). This example establishes no loading or compliance claim and does not describe a sandbox, ownership, or access-control boundary. Global guidance remains separate.

<a id="windows-path-policy-design-decisions-requiring-implementation-validation"></a>
## Windows path policy: implemented subset and remaining unknowns

Retain the original path, parsed namespace/host context, lexical comparison, optional physical identity evidence, and accessibility status. Handle ordinary drive paths, UNC, and extended drive/UNC paths explicitly. The synthetic paths `C:\Synthetic\atlas` and `\\?\C:\Synthetic\atlas` have a qualified lexical comparison. ASCII case folding and supported extended drive/UNC comparison are tested; Unicode sequences stay conservatively distinct. This is not physical identity or a rule to strip every extended prefix. Filesystem discovery refuses UNC/device forms. Exact namespaced drive-root lstat alone uses an equivalent ordinary drive root; managed attributes and stored paths retain the original form.

Normalize only when semantics are preserved. Do not blindly lowercase paths, discard namespace-sensitive components, expand arbitrary variables, resolve drive-relative paths against the scanner's CWD, or equate different hosts. Use component-aware ancestry, not raw prefix matching. Keep junction/symlink targets distinct from lexical paths; avoid recursive traversal. Case behavior, long paths, Unicode aliases, and 8.3 aliases need synthetic and Windows tests.

Distinguish missing, inaccessible, offline, unsupported, and not inspected. No automatic network-share traversal, WSL path translation, or whole-disk search is planned.

## Assumptions and unknowns

Assumption A-03: validated metadata can support useful UI-membership approximations; it may not prove UI visibility. Unknown classifications remain unknown if reliable discriminators are unavailable.

Unknown: physical identity primitives and per-directory case handling appropriate for the supported Node/Windows environment. macOS path behavior requires separate verification. See [Q-04 and Q-05](research/open-questions.md).
