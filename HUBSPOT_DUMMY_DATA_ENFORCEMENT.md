# HUBSPOT DUMMY DATA ENFORCEMENT (LOCKED)

**Status:** Authoritative, locked. Changes require security approval and PR sign-off from architecture + compliance.
**Scope:** Data, DB schema, APIs, UI, automation, reporting, tests, CI/CD, environments, permissions.
**Goal:** This CRM cannot display, store, or generate dummy data. Any attempt fails deterministically.

---

## Global Invariants
- No seed/dummy/demo data anywhere (build, deploy, runtime, tests).
- All records originate from authenticated runtime API calls and emit Activities.
- No alternate truth stores; Activities + properties are the only history and state reconstruction source.
- No bypass roles/modes (demo/sandbox). ALLOW_DUMMY_DATA must be "false" in all environments.

## Data Layer (Database)
**Forbidden (hard fail):** seed scripts, fixtures, default/example rows, placeholder values (example.com, test@, demo, John Doe, Acme, Sample Co, Mock User).
**Required:** tables empty on first boot; every insert goes through authenticated API and emits Activity.
**Schema guards (add via migrations):
- Contacts, Users, Companies, Email logs: CHECK to block dummy patterns:
```
CHECK (
  email NOT ILIKE '%example%'
  AND email NOT ILIKE '%test%'
  AND email NOT ILIKE '%demo%'
)
```
- Append-only Activities: NO UPDATE/DELETE; immutable `occurredAt` default now(); `createdAt` is insert time; ordered by `occurredAt`.
- Activity foreign keys must not cascade-delete from Contact/Deal/Ticket; use RESTRICT; deletions are archive-only.
- Activity existence guard: for Contact/Deal/Ticket creation, enforce *_CREATED Activity in same transaction (trigger or constraint); property updates require PROPERTY_UPDATED Activity.

## API Layer
**Forbidden:** /seed, /demo, /mock, /preview, /sample, /populate routes; any payload flag `isDemo|isSample|isMock`.
**Required:**
- Auth required on all create/update.
- Each mutation emits ≥1 Activity with real timestamps and IDs.
- Middleware hard guard:
```
if (payload?.isDemo || payload?.isSample || payload?.isMock) {
  throw new Error('Dummy data forbidden');
}
```
- Reject emails/domains matching dummy patterns.

## UI Layer
**Forbidden:** placeholder rows, "Example contact", "Try this demo", hardcoded cards, fake timelines.
**Required:**
- Empty states only when no data; must show "No data yet".
- Lists render only server-backed items with real IDs.
- Timelines render only from Activity API.
- No client-side generation of synthetic records.

## Automation
**Forbidden:** auto-creating contacts, backfilling fake activities, synthetic enrollments, time-based generators producing dummy data.
**Required:** automation only reacts to real Activities; idempotency keys enforced; append-only execution log; emits Activities for any writes.

## Reporting
**Forbidden:** pre-filled charts, sample KPIs, cached aggregates as truth.
**Required:** reports render empty until data exists; metrics derive from Activities + rebuildable projections; no write-back of aggregates.

## Testing & CI
**Forbidden:** fixture-based tests, snapshot data, mock CRM objects with dummy values.
**Required:** property-based tests, contract tests, schema/invariant tests only.
**CI hard fail:**
```
grep -R "example.com\|demo\|seed\|fixture" . && exit 1
```

## Environment Guard
- `ALLOW_DUMMY_DATA` must equal "false"; process must throw if not set to "false".
- No demo/sandbox modes; production rules apply everywhere.

## Role & Permission Guard
- No "demo admin" or "sandbox" roles; all permissions enforced identically.
- Activity/Audit trail required for privileged actions.

## Violation Response (automatic)
- Reject write, log error, emit audit event, fail CI/deploy. No soft warnings or overrides.

## Rollout Requirements
- Add DB constraints + triggers via migration (no data loss; ensure zero dummy rows before apply).
- Add API middleware guard globally.
- Add env assertion at process start.
- Add CI grep guard.
- Add UI empty-state and ID-backed rendering checks.

## Ownership
- Security + Architecture own this document. Changes require joint approval.
