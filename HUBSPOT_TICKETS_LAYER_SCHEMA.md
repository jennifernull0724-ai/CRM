# HubSpot Tickets Layer — Service Hub Parity (Authoritative)

**Depends on**: Contacts (system anchor), Companies (context), Activities (immutable), Nav/Router (permission-gated).  
**Deliverable**: HUBSPOT_TICKETS_LAYER_SCHEMA.md

---

## 1) Role of Tickets (Non-Negotiable)
- Tickets represent service interactions and case state.
- Tickets do **not** own history or timelines; Contacts remain the anchor for all Activities.
- Ticket state is projected from Activities.

---

## 2) Ticket Core Object (Base Table)
```prisma
model Ticket {
  id          String    @id @default(uuid())
  subject     String
  status      String    @default("new")      // new, open, waiting, on_hold, closed
  priority    String    @default("medium")   // low, medium, high, urgent
  pipelineId  String
  stageId     String
  ownerId     String?
  companyId   String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  closedAt    DateTime?
  archivedAt  DateTime?

  properties  TicketProperty[]
  contacts    TicketContactAssociation[]
  companies   TicketCompanyAssociation[]
}
```
**Hard Rules**
- Mutable; soft-delete only (`archivedAt`).
- No embedded history; no timeline table.

---

## 3) Ticket Property System (Dynamic)
**Current Values**
```prisma
model TicketProperty {
  id          String   @id @default(uuid())
  ticketId    String
  propertyKey String
  value       String
  updatedAt   DateTime @default(now())

  ticket      Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  @@unique([ticketId, propertyKey])
  @@index([ticketId])
}
```

**History (Immutable)**
```prisma
model TicketPropertyHistory {
  id          String   @id @default(uuid())
  ticketId    String
  propertyKey String
  oldValue    String?
  newValue    String?
  changedBy   String?
  activityId  String
  changedAt   DateTime @default(now())

  ticket      Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  @@index([ticketId])
  @@index([activityId])
}
```

**Rule**: Every property mutation emits a **Contact-anchored** `ticket_property_changed` Activity.

---

## 4) Ticket ↔ Contact Associations (Required)
```prisma
model TicketContactAssociation {
  id         String    @id @default(uuid())
  ticketId   String
  contactId  String
  role       String    // requester, cc, follower
  createdAt  DateTime  @default(now())
  archivedAt DateTime?

  ticket     Ticket    @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  contact    Contact   @relation(fields: [contactId], references: [id], onDelete: Cascade)

  @@unique([ticketId, contactId, role])
  @@index([ticketId])
  @@index([contactId])
}
```
**Enforcement**
- Every Ticket **must** have ≥1 Contact.
- Soft-delete only (`archivedAt`).
- Create/remove emits Contact Activity: `ticket_contact_added` / `ticket_contact_removed`.

---

## 5) Ticket ↔ Company Association (Optional)
```prisma
model TicketCompanyAssociation {
  id         String    @id @default(uuid())
  ticketId   String
  companyId  String
  createdAt  DateTime  @default(now())
  archivedAt DateTime?

  ticket     Ticket    @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  company    Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([ticketId, companyId])
  @@index([ticketId])
  @@index([companyId])
}
```
**Rule**: Optional; associations emit Contact Activity `ticket_company_associated`.

---

## 6) Activity Model — Ticket Events (Contact-Owned)
Tickets never store Activities. All events are Activities anchored to associated Contacts.

**Ticket Activity Subtypes**
- `ticket_created`
- `ticket_updated`
- `ticket_status_changed`
- `ticket_priority_changed`
- `ticket_stage_changed`
- `ticket_assigned`
- `ticket_closed`
- `ticket_reopened`
- `ticket_contact_added`
- `ticket_contact_removed`
- `ticket_company_associated`
- `ticket_note_added`
- `ticket_email_sent`
- `ticket_email_received`
- `ticket_call_logged`
- `ticket_meeting_logged`
- `ticket_attachment_added`

**Rule**: No Ticket event exists without a Contact target. If none exist, events queue and emit once a Contact is associated.

---

## 7) Notes, Tasks, Email, Calls, Meetings (Parity)
- All are Activities anchored to Contacts.
- Notes: rich text; @mentions resolved server-side → Activity.
- Tasks: create/complete/reassign → Activity.
- Email: send+log; `externalMessageId` required; threading via headers; immutable once logged.
- Calls/Meetings: logged only, immutable.
- Files: attachment events only; no Ticket-owned file state beyond references.

---

## 8) Inbox Model (Stateless CRM)
- Inbox is derived; not stored as CRM data.
- Backed by provider + Activity stream.
- Read/unread is user preference (outside CRM data plane).
- Logging creates immutable Activities.
- **No inbox tables** in CRM schema.

---

## 9) Ticket Timeline (Projected Only)
Projection (no stored timeline):
```
TicketTimeline(ticketId) =
  SELECT a.*
  FROM activities a
  JOIN ticket_contact_association tca
    ON tca.ticket_id = ticketId
   AND tca.contact_id = a.contact_id
  WHERE a.metadata ->> 'ticketId' = ticketId
    AND a.created_at BETWEEN tca.created_at AND COALESCE(tca.archived_at, NOW())
  ORDER BY a.created_at DESC;
```
- No duplication; fully reconstructable; time-scoped by association window.

---

## 10) Pipelines & Stages (Service)
```prisma
model TicketPipeline {
  id        String   @id @default(uuid())
  name      String
  ordering  Int      @default(0)
}

model TicketStage {
  id          String   @id @default(uuid())
  pipelineId  String
  name        String
  ordering    Int      @default(0)
  isClosed    Boolean  @default(false)
  isResolved  Boolean  @default(false)

  pipeline    TicketPipeline @relation(fields: [pipelineId], references: [id], onDelete: Cascade)
}
```
- Stage changes emit Activities; probability/SLAs derive from events.

---

## 11) SLAs (Event-Driven)
```prisma
model TicketSLA {
  id             String   @id @default(uuid())
  ticketId       String
  metric         String   // first_response, next_response, resolution
  targetDuration Int      // seconds or ms, implementation-defined
  startedAt      DateTime
  pausedAt       DateTime?
  breachedAt     DateTime?

  ticket         Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  @@index([ticketId])
  @@index([metric])
}
```
- Starts/stops from Activities; no cron-based mutation that alters history; fully auditable.

---

## 12) Permissions & Nav
Routes (permission-gated before render):
- `/tickets`
- `/tickets/new`
- `/tickets/:ticketId`

Rules:
- Permission gate (router → gate → load → render); UI never enforces after render.
- Nav derived from scopes; no scope → no nav entry.
- Ticket App loads dynamically; no business logic in nav.

---

## 13) Guarantees
- Contacts remain the anchor; Activities immutable.
- Tickets project state; no ticket-owned timelines.
- Inbox is stateless in CRM data.
- SLA is event-driven; audit trail preserved.
- HubSpot Service Hub parity maintained.
