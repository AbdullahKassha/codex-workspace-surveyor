# Documentation index

**Current supplement, 2026-10-07:** [PSQ-001](research/personal-qualification-observation.md) records founder-reported candidate-structure and one-row type/nullness qualification. No actual record strings were returned. The next authorized implementation is the [synthetic two-field adapter](research/thread-cwd-adapter-validation.md) under ADR 0011; personal value reads require new consent after independent review. Earlier stage summaries retain their historical context.

**Current supplement, 2026-10-06:** [PCAN-001](research/personal-canary-observation.md) records a founder-reported successful personal closed-app canary and separately attributed patch-runtime synthetic qualification. The original personal authorization is consumed. Bounded schema/metadata qualification is now authorized for synthetic preparation only, with independent review and a new personal authorization required. The following preparation-stage summary is historical; the product CLI remains synthetic and native acquisition remains fail-closed.

**Stage: personal closed-app canary preparation; CLI remains the M1 demonstration.** M2a.1–M2a.4 preserve native refusal. The committed isolation-feasibility record reports a readiness gap. A separate private canary runner is prepared and tested only on invented sources; personal execution requires independent review and exact later consent. No real Codex state or processes were inspected. These documents distinguish synthetic measurements from future intent and historical evidence; no real audit or visual UI exists.

## Product and design

- [Product](product.md): problem, audience, intended outcomes, scope, and recommendations.
- [Architecture](architecture.md): conceptual stages and deferred implementation choices.
- [Relationship model](relationship-model.md): vocabulary, identities, paths, and conflicts.
- [Safety and privacy](safety-and-privacy.md): research boundaries, future acquisition requirements, and reporting.
- [Compatibility](compatibility.md): baseline matrix, future comparison, and rule retirement.
- [Roadmap](roadmap.md): milestone gates and completion criteria.

## Evidence and research

- [PSQ-001: Personal qualification observation](research/personal-qualification-observation.md): supplied sanitized result, limited row evidence, separate context and procedural observations.
- [Synthetic two-field adapter validation](research/thread-cwd-adapter-validation.md): private record/CWD claims, bounds, coverage, refusal, privacy and cleanup gating.

- [PCAN-001: Personal canary observation](research/personal-canary-observation.md): supplied sanitized result, separate runtime qualification and preceding version observations, reported cleanup and strict limits on what the result establishes.
- [Copied-schema qualification preparation](research/personal-qualification-preparation-validation.md): synthetic fixed-schema/type/nullness tests, preserved protected acquisition/recovery, limitations and separately gated future manual procedure.
- [Evidence catalog](research/evidence-catalog.md): category definitions, observation index, and official-source records.
- [Windows observations, 2026-10-04](research/windows-2026-10-04.md): original investigation, WIN-001–WIN-017.
- [Project Boundary observations](research/project-boundary-observations.md): separate article-derived founder research, WIN-018–WIN-020; historical versions uncertain.
- [State sources](research/state-sources.md): candidate sources, scope, and unresolved semantics.
- [CWD migration experiment](research/cwd-migration.md): synthetic reconstruction of the causal sequence.
- [Open questions](research/open-questions.md): investigations, prerequisites, and expected outcomes.
- [Compatibility revalidation template](research/compatibility-revalidation-template.md): lightweight future comparison and retirement record.
- [Synthetic acquisition validation](research/synthetic-acquisition-validation.md): M2a.1 mechanics, fault injection and unresolved Windows protection.
- [Windows acquisition controls validation](research/windows-acquisition-controls-validation.md): M2a.2 synthetic mode/access and handle-sharing observations, capability gaps and separately gated helper proposal.
- [Windows helper experiment validation](research/windows-helper-experiment-validation.md): M2a.3 descriptor readback, cross-process sharing, bounded synthetic copies, refusal/privacy/cleanup and remaining unknowns.
- [Synthetic helper integration validation](research/synthetic-helper-integration-validation.md): M2a.4 retained-set copying, protected acquisition/analysis separation, final verification, fault evidence and exact cleanup.
- [Disposable Codex isolation feasibility](research/disposable-codex-isolation-feasibility.md): bounded host checks, official isolation options, readiness gap and separately gated setup/creation/acquisition/inspection requirements; no real Codex experiment.
- [Personal canary preparation](research/personal-canary-preparation-validation.md): external-source/scratch separation, protected retained-handle copying, schema-only probes, authenticated restart recovery with helper-owned synchronous deletion, deadline/exclusion evidence, pre-spawn validation and residual disclosures; independent re-review and personal consent remain required.

## Decisions

ADR 0001–0005 are the founding decisions. ADR 0006 records the later pre-M1 naming decision; it does not supersede their behavioral or safety requirements. Historical observations and founding ADR wording may refer to Codex Workspace Doctor or Workspace Doctor, the former working names of Workspace Surveyor for Codex.

- [ADR 0001: observation and action](decisions/0001-observation-and-action-boundary.md).
- [ADR 0002: evidence and identity](decisions/0002-evidence-and-identity-reconciliation.md).
- [ADR 0003: Windows first](decisions/0003-windows-first-support.md).
- [ADR 0004: privacy and synthetic artifacts](decisions/0004-privacy-and-synthetic-artifacts.md).
- [ADR 0005: CLI first and early visuals](decisions/0005-cli-first-and-early-visual-experience.md).
- [ADR 0006: project naming and CLI surface](decisions/0006-project-naming-and-cli-surface.md).
- [ADR 0007: synthetic CLI foundation](decisions/0007-synthetic-cli-foundation.md).
- [ADR 0008: synthetic acquisition kernel](decisions/0008-synthetic-acquisition-kernel.md).
- [ADR 0009: separately authorized personal closed-app canary](decisions/0009-personal-closed-app-canary.md).
- [ADR 0010: bounded copied-schema qualification preparation](decisions/0010-copied-schema-qualification.md).
- [ADR 0011: private two-field adapter preparation](decisions/0011-thread-cwd-adapter-preparation.md).

## Qualified manual workflows

- [Projectless CWD migration](workflows/projectless-cwd-migration.md).
- [Managed worktree review](workflows/managed-worktree-review.md).

These workflows preserve experimental guidance. M0 does not authorize running them.

## Reading claims

The five categories are **founder-observed experiment**, **official documentation**, **design decision**, **assumption**, and **unknown**. Section labels apply to claims within that section unless a paragraph says otherwise. Mixed tables label each row. See the [definitions](research/evidence-catalog.md#claim-categories).

Founder evidence was supplied during planning or reported in the referenced founder article, not independently reproduced by Workspace Surveyor. Missing historical versions remain unknown. Documentation access dates indicate when a source was reviewed, not when a product behavior began. The original baseline contains 17 observations; the three boundary records are a separate research group.

All identifying example values are synthetic. Technical filenames and field names describe candidate sources; they are not repository artifacts.
