# ADR 0009: Separately authorized personal closed-app canary

- Date: 2026-10-06.
- Status: accepted for preparation; personal execution requires separate consent after independent review.
- Category: design decision.
- Preserves: ADR 0001–0008 and all historical validation records.

## Context

M2a.1–M2a.4 validated invented-file mechanics and selected Windows controls. The committed disposable-isolation feasibility slice established a readiness gap, not isolation. The founder chooses a narrowly consented personal canary without requiring a VM. This changes the proposed sequence, not the source-mutation prohibition or the historical feasibility outcome.

## Decision

Prepare a private runner under `test/support`, outside product imports and the CLI. Preparation tests use invented files and injected closure observations only. No current personal source, effective Codex location, schema or writer list is discovered or validated during preparation.

A subsequent single-run authorization must identify the exact database, its exact companion checks, complete relevant writer process-name list, full-copy exposure, selected PowerShell executable, scratch parent, fixed private recovery slot, limits and exact cleanup. Run from a standalone local terminal after all relevant Codex sessions, including the authorizing chat, have closed. Local hidden confirmation supplements that authorization; an opt-in alone is not permission.

Select one database alone or with both existing WAL and SHM. Refuse rollback journals, incomplete companions, redirection, overlap, instability and unsupported shapes. Do not discover candidates, follow stored paths, query application records, repair, checkpoint, vacuum, rename, delete or change source ACLs. Never open originals through SQLite.

Keep source ownership separate from scratch ownership. The managed helper protects scratch using the M2a.3 current-user-only descriptor policy and acquires the entire selected retained Open/Read/FileShare.Read handle set before any source-byte read. Hash and copy through those handles only. Retain them through copied-only analysis and final content verification. Cleanup has authority over authenticated current-run scratch only.

Limits are 16 MiB per selected file and 32 MiB selected content, with two protected copies: at most seven scratch files including ownership, three directories including the root, and 64 MiB plus 8 KiB scratch content. Earlier synthetic defaults remain unchanged. Preserve an untouched acquisition set and separate analysis set. Analysis runs only these two fixed probes, discarding their values:

```sql
PRAGMA schema_version;
SELECT 1 FROM main.sqlite_schema LIMIT 1;
```

Read-only/defensive SQLite setup disables extensions and untrusted schema behavior; an authorizer denies application-table and catalog-column reads. This is a readability probe, not schema qualification. Report fixed outcome categories, counts and booleans; no personal paths, IDs, hashes, schema values, account identifiers or raw diagnostics.

## Consequences and authorization boundary

**P1/P2 review correction, 2026-10-06:** before any source-content read, establish an immutable authenticated recovery record and a separate 32-byte key in `WorkspaceSurveyor-Canary-Recovery` under the Windows Local Application Data known folder. Protect and independently verify both files and their directory with the current-user-only policy; flush and reread before copying. The record contains only format version, recovery-directory identity, scratch path/identity, ownership nonce and fixed member names/kinds/identities. HMAC-SHA256 authenticates the exact payload bytes. No source path, source hashes, process list, content or diagnostics are persisted. Bound this separate control storage to one directory, two files and 16 KiB; the record itself is at most 8 KiB.

The helper and Node retain record lifetime handles through their scratch work. Explicit restart recovery must obtain exclusive record access and authenticate the inventory before deleting anything. Unknown entries, replaced identities, lost authentication or active handles refuse. Keep the ownership marker until child deletion completes; a markerless root may be removed only when empty and still matching the authenticated root identity. An absent root requires no scratch deletion. Remove control metadata only after positive scratch absence; metadata-removal failure remains residual. Existing slots block new acquisition and are never overwritten. Same-account hostile changes, power loss and abrupt termination remain outside the demonstrated guarantee.

Validate/encode the initial helper request and reserve bounded follow-up framing before spawning. Allocate the session under its caller's lifecycle ownership before explicit startup; every post-spawn failure retains that owner. Preparation uses only synthetic recovery slots and graceful controlled child processes. This supersedes the initial process-local-only recovery design; it does not authorize personal execution or searching for earlier lost locators.

**Remaining P1 lifetime correction, 2026-10-06:** review found that the helper could expire its receive deadline while Node synchronously deleted scratch, releasing exclusion before deletion stopped. Keep Node's identity/inventory authentication and move every destructive recovery scratch operation into the exclusive-handle helper. Node authorizes one fixed member at a time; the helper verifies protection and marker/emptiness conditions, deletes synchronously and acknowledges completion under its retained handle. No background deletion or Node scratch-deletion recovery fallback is permitted. Receive deadlines, EOF, cancellation and malformed commands stop subsequent dispatch; disposal runs only after the current operation has returned. Neither the 30-second timeout nor resolved P2 startup behavior changes. Control metadata is retired only after positive scratch absence and confirmed helper closure. Uncertain completion remains residual with available authentication retained.

Native acquisition remains fail-closed. No public helper interface, production integration, audit capability, dependency, Codex launch, App Server, disposable environment, personal canary execution or M2b/M2c is authorized by preparation.

Descriptor configuration does not prove other-account effective access. Finite approved-name process observations cannot discover omitted writers or prevent restart. Retained sharing is not atomic database/companion acquisition. Hostile races, mapped writers, transient writes, crash cleanup and secure erasure remain unproven.

Preparation must pass synthetic regression/privacy/cleanup validation and independent review. Later schema-only success may justify a further bounded schema/metadata qualification proposal before M2b; it never authorizes that step automatically. See the [preparation record and external-run procedure](../research/personal-canary-preparation-validation.md).
