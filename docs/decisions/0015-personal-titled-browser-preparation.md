# ADR 0015: Personal titled-location browser preparation

- Date: 2026-10-08.
- Status: accepted for synthetic preparation; independent review and fresh personal consent precede execution.
- Category: design decision, supplementing [ADR 0014](0014-named-threads-and-local-projects.md).

## Decision

Prepare one private standalone browser operation that qualifies ordinary declared-TEXT `main.threads.title` and reads bounded ID/CWD/title values from the protected analysis copy. The existing projected schema checks and fixed queries remain unchanged. Stored labels are candidates; founder comparison against already-known Desktop titles is required to qualify their semantics. Missing/incompatible titles retain the existing fallback without implying successful title qualification.

Real Project registry keys/types and reference semantics remain unknown. The new personal entry selects only the exact approved database and its supported companions, never JSON. The existing synthetic DB+one-JSON profile and authenticated v2 inventory remain regression infrastructure. The managed helper needs no change for the database-only path: it already supports personal database sets through retained read handles. Its rejection of personal JSON profiles remains intentional until a finite real decoder is separately prepared and reviewed. No guessed registry or generic structural discovery is authorized.

## Acquisition and delivery boundary

Give browser acquisition a dedicated consent/opt-in gate and attempt tracker independent of the MAP result gate. Require `WORKSPACE_SURVEYOR_PERSONAL_CANARY=1`, `WORKSPACE_SURVEYOR_PERSONAL_EXPLORER=1`, and explicit full-copy, actual-value, title and local-browser consent. Reject personal hooks/faults and JSON before source/recovery access. Confirmation alone does not consume the attempt. The first consented source/recovery access or location-helper startup consumes it, preserving classification through every later outcome. No automatic retry or persistent authorization ledger is added.

Use the unchanged seven-file/three-directory/64 MiB plus 8 KiB scratch budget, 16 MiB per source file, 32 MiB selected content, and separate one-directory/two-file/16 KiB recovery-control allowance. Keep complete retained handle acquisition, protected copies, untouched acquisition versus analysis, final verification, helper exit and authenticated cleanup. Usable thread claims and completed safety checks are required before releasing the one-use snapshot. Empty/fully omitted tables yield no browser capability; missing title capability may still provide useful stored-location claims.

Reuse the reviewed browser server and entry shutdown lifecycle. Cancellation during prompts prevents coordinator startup; cancellation after startup awaits safe acquisition cleanup and withholds delivery. Signals remain owned through final cleanup, with sanitized safety evidence retained. There is no synthetic fixture cleanup in a personal run; its fixture-cleanup fields remain `not-run` rather than invented success.

Browser values remain memory-only and local. Session expiry/pagehide/Close retain their existing limits, including best-effort page-exit delivery and no secure browser-memory-erasure guarantee. No export, persistence, upload, stored-path access, product CLI, dependency or UI redesign is introduced.

## Project qualification prerequisite

Before a real decoder is implemented, nominate exact registry and assignment branches from already-known sanitized structure or authoritative evidence. Qualify only container types, fixed field names/types, keyed versus explicit identity, label/root multiplicity, and reference namespaces. Dynamic identity keys stay private. Keys/types cannot establish UI semantics or explicitly-unassigned meaning. A later frozen allowlist and founder comparison must support those conclusions. Unknown or incompatible structures disable dependent capabilities; ambiguity/dangling references survive reconciliation.

The model vocabulary distinguishes synthetic-qualified, structure-qualified and unavailable Projects separately from qualified/unknown correspondence. The new operation always reports Projects unavailable. A structure-qualified status does not itself permit cross-source assignment resolution.

See the [preparation validation and proposed run sheet](../research/personal-explorer-preparation-validation.md). No personal execution, real recovery-slot access, historical residual search, staging, commit or push is authorized by preparation.

## Superseding local launch decision, 2026-10-08

[ADR 0016](0016-local-read-only-explorer-and-title-previews.md) replaces the everyday explorer authorization choreography and optional-title budget. The decisions and measurements above preserve their historical context. Acquisition/recovery protection and unavailable real Projects remain binding.
