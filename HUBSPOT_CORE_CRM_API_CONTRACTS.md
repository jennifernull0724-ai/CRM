# HubSpot Core CRM API Contracts (REST / RPC)

**DEPENDENCIES (READ-ONLY)**: HUBSPOT_CORE_CRM_SCHEMA.md, HUBSPOT_DEALS_LAYER_SCHEMA.md

**ARCHITECTURAL TRUTH**: APIs append truth to the activity stream. Every write emits an Activity. All writes are idempotent. All reads are projections. Activities are append-only. Contacts gate all access. Deals consume Contact activities.

---

## 1) ENDPOINT LIST (METHODS + PURPOSE)

### Contacts
- `POST /crm/contacts` — Create contact (idempotent via Idempotency-Key)
- `PATCH /crm/contacts/{contactId}/properties` — Update contact properties (idempotent key)
- `POST /crm/contacts/merge` — Merge contacts (primary + secondary)
- `GET /crm/contacts/{contactId}/timeline` — Contact timeline projection (read-only)

### Activities (Generic)
- `POST /crm/activities` — Create immutable activity (generic types)

### Notes
- `POST /crm/contacts/{contactId}/notes` — Create note activity (server parses @mentions)

### Tasks
- `POST /crm/contacts/{contactId}/tasks` — Create task activity
- `POST /crm/tasks/{taskId}/complete` — Complete task (emits task_completed)

### Email
- `POST /crm/contacts/{contactId}/emails/send` — Send email + log email_sent (idempotent key)
- `POST /crm/contacts/{contactId}/emails/log` — Log external email (email_logged, dedupe by externalMessageId)
- `POST /crm/email/receive` — Provider ingest (email_received) only if contact match

### Calls
- `POST /crm/contacts/{contactId}/calls` — Log call (call_logged)

### Meetings
- `POST /crm/contacts/{contactId}/meetings` — Log meeting (meeting_logged)

### Files
- `POST /crm/contacts/{contactId}/files` — Upload + log file_uploaded (activity holds metadata)

### Deals
- `POST /crm/deals` — Create deal (requires ≥1 contact, emits deal_created to primary contact)
- `POST /crm/deals/{dealId}/stage` — Change stage (emits deal_stage_changed / deal_closed_won / deal_closed_lost)
- `POST /crm/deals/{dealId}/contacts` — Associate contact (emits association_created / deal_contact_added)
- `GET /crm/deals/{dealId}/timeline` — Deal timeline projection (derived from contact activities)

---

## 2) IDEMPOTENCY RULES
- **Idempotency-Key header (UUID)** required on all mutating endpoints marked above. Server stores (key, route, body-hash, user) for a TTL; repeat returns the original result without duplicating activities.
- No bulk overwrite endpoints. No blind upserts. All writes must be explicit and idempotent.
- Deduplication specifics:
  - `email_sent` / `email_logged` / `email_received`: dedupe by `externalMessageId` + `contactId`.
  - Property updates: if value unchanged, no-op; otherwise log `property_updated`.
  - Merge: secondary → primary is one-way; replays with same key return the prior merge result.

---

## 3) ACTIVITY EMISSION MAPPING (WRITE → ACTIVITY)

| Endpoint | Activity Type/Subtype | Notes |
| --- | --- | --- |
| POST /crm/contacts | `contact_created` | Anchored to contactId created. |
| PATCH /crm/contacts/{id}/properties | `property_updated` | One activity per logical change; old/new captured. |
| POST /crm/contacts/merge | `merge_performed` | Anchored to primary contact; all secondary activities preserved. |
| POST /crm/activities | `<type>` | Generic create; immutable. |
| POST /crm/contacts/{id}/notes | `note` | Mentions parsed server-side. |
| POST /crm/contacts/{id}/tasks | `task` | Task creation. |
| POST /crm/tasks/{taskId}/complete | `task_completed` | Does not mutate original task activity. |
| POST /crm/contacts/{id}/emails/send | `email_sent` | Stores `externalMessageId`; deduped. |
| POST /crm/contacts/{id}/emails/log | `email_logged` | Deduped by `externalMessageId`. |
| POST /crm/email/receive | `email_received` | Only if contact match; deduped. |
| POST /crm/contacts/{id}/calls | `call_logged` | Immutable. |
| POST /crm/contacts/{id}/meetings | `meeting_logged` | Immutable. |
| POST /crm/contacts/{id}/files | `file_uploaded` | File deletion never removes activity. |
| POST /crm/deals | `deal_created` | Anchored to primary contact. |
| POST /crm/deals/{dealId}/stage | `deal_stage_changed` \| `deal_closed_won` \| `deal_closed_lost` | Anchored to primary contact; no overwrite of prior state. |
| POST /crm/deals/{dealId}/contacts | `association_created` / `deal_contact_added` | Anchored to the contact being added; preserves history. |

**Immutability**: Activities are never edited or deleted. History is append-only.

---

## 4) READ PROJECTIONS (NO MUTATION)

- `GET /crm/contacts/{contactId}/timeline`
  - Returns activities for the contact ordered by `createdAt desc`.
  - Filter: `type`, `subtype`, `date range`, `limit`.
  - Projection only; cannot mutate.

- `GET /crm/deals/{dealId}/timeline`
  - Derives from activities anchored to associated contacts where `metadata.dealId == dealId` (deal events) plus general contact activities within association window.
  - Projection only; cannot mutate.

---

## 5) PERMISSION ENFORCEMENT MATRIX (SERVER-SIDE, PRE-EXECUTION)

| Operation | Required | Denial Behavior |
| --- | --- | --- |
| Contact read | `canReadContact(contactId, user)` | 404/403 without disclosing existence. |
| Contact write | `canWriteContact(contactId, user)` | Reject before mutation. |
| Deal read | `canReadDeal(dealId, user)` **and** at least one associated contact readable | 404/403. |
| Deal write | `canWriteDeal(dealId, user)` | Reject before mutation. |
| Activity create | `canWriteActivity(contactId, user)` | Reject if contact not readable or writeable per policy. |
| File upload | Same as contact write for target contact | Reject before upload. |
| Email receive | System auth + matched contact readable | Reject if no matching contact. |

**No UI-layer checks**: All permission checks are server-side gates. Nav/clients never decide access.

---

## 6) CONTRACTUAL RULES (ENFORCED)

- **No endpoint mutates history**; all changes append Activities.
- **No endpoint edits activities**; activities are immutable.
- **No bulk overwrite** endpoints.
- **No upsert without idempotency key**; all writes must be idempotent.
- **No cross-entity side effects**; each endpoint operates on its own aggregate, emits its own activity.
- **No timeline endpoints that write state**; reads are pure projections.
- **Contacts gate access**; deals inherit visibility via contact associations.
- **Deals do not own activities**; they consume contact-anchored activities with deal metadata.

---

## 7) REQUIRED VALIDATION TESTS (PASS/FAIL CRITERIA)

1) **Idempotent retries**: Replaying POST with same Idempotency-Key returns same result; no duplicate activities.
2) **Timeline rebuild**: Contact timeline equals ordered activities store; no extra state needed.
3) **Merge preservation**: After merge, all activities from secondary still present under primary; merge_performed logged.
4) **Deal timeline derivation**: Deal timeline derived from contact activities; no separate deal-history table.
5) **External email deduplication**: `externalMessageId` prevents duplicate email activities across send/log/receive.
6) **Permission denial before mutation**: Any lacking permission rejects request pre-write and emits no activity.

---

## 8) ERROR CONTRACT (SUMMARY)

- 400: Validation error (missing fields, bad metadata schema, duplicate email on create, invalid idempotency key)
- 401: Unauthenticated
- 403: Permission denied (do not leak existence)
- 404: Not found or not visible (use same response for hidden resources)
- 409: Conflict (idempotency violation with different payload, duplicate primary email)
- 422: Unsupported activity type or metadata schema mismatch
- 429: Idempotency replay limit exceeded (optional)

---

## 9) IDENTITY & DEDUP KEYS

- **Idempotency-Key header** (UUID) on all writes marked idempotent.
- **externalMessageId** for email send/log/receive deduplication.
- **contactId/dealId** must be valid and permission-checked prior to write.

---

## 10) FINAL AXIOMS (NON-NEGOTIABLE)

- APIs do not “update CRM”; they append truth to the activity stream.
- Every write emits an Activity; Activities are immutable and append-only.
- Reads are projections; timelines rebuild from the activity log.
- Contacts remain the anchor; Deals consume but never own activities.
