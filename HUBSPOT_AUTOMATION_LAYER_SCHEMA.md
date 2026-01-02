# HubSpot Automation Layer — Workflows Engine (Authoritative)

**Depends on**: Contacts (anchor), Companies, Deals, Tickets, Activities (immutable), Properties (dynamic), Nav/Router.  
**Deliverable**: HUBSPOT_AUTOMATION_LAYER_SCHEMA.md

---

## 1) Role of Automation (Non-Negotiable)
- Automation reacts to facts; it does not create truth.
- Facts = immutable Activities + property snapshots.
- Actions may emit new Activities or mutate allowed objects; automation never mutates Activities directly.
- No automation-owned history; event-driven orchestration only.

---

## 2) Workflow Core Object
```prisma
model Workflow {
  id          String    @id @default(uuid())
  name        String
  objectType  String    // contact | company | deal | ticket
  status      String    @default("draft") // draft | active | paused | archived
  createdBy   String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  archivedAt  DateTime?

  triggers    WorkflowTrigger[]
  steps       WorkflowStep[]
  enrollments WorkflowEnrollment[]
  executions  WorkflowExecution[]
}
```
**Rules**
- Workflows are mutable; history (executions) is append-only.
- Archiving preserves history.

---

## 3) Enrollment Model (Event-Driven)
```prisma
model WorkflowEnrollment {
  id          String    @id @default(uuid())
  workflowId  String
  objectId    String
  enrolledAt  DateTime  @default(now())
  exitedAt    DateTime?
  exitReason  String?

  workflow    Workflow  @relation(fields: [workflowId], references: [id], onDelete: Cascade)
}
```
**Enrollment Triggers**
- property_changed (observed via Activity/property history)
- activity_occurred
- object_created
- association_added / association_removed
- date_reached
- manual_enrollment (explicit Activity)

**Rules**
- No polling; no cron-based diffs. Event-driven only.

---

## 4) Triggers (Declarative)
```prisma
model WorkflowTrigger {
  id          String   @id @default(uuid())
  workflowId  String
  type        String   // property_changed | activity_occurred | object_created | association_added | association_removed | date_reached | manual_enrollment
  config      Json
  createdAt   DateTime @default(now())

  workflow    Workflow @relation(fields: [workflowId], references: [id], onDelete: Cascade)
}
```
- Triggers evaluate against immutable events and property snapshots—not UI state.

---

## 5) Conditions (Pure, Side-Effect Free)
```prisma
model WorkflowCondition {
  id          String   @id @default(uuid())
  workflowId  String
  stepId      String?
  operator    String   // equals, contains, changed, in, not_in, count_gte, has_association, lifecycle_is, etc.
  operands    Json
}
```
- Examples: property equals/contains/changed; lifecycle stage; has associated company; has open tickets; activity count ≥ N.
- Conditions never mutate data.

---

## 6) Actions (Safe, Scoped)
```prisma
model WorkflowAction {
  id          String   @id @default(uuid())
  workflowId  String
  stepId      String?
  type        String   // set_property, clear_property, create_task, send_email, add_note, rotate_owner, assign_owner, associate_object, disassociate_object, create_ticket, update_ticket, webhook_call, delay
  config      Json
  order       Int      @default(0)
}
```
**Allowed Action Types**
- `set_property`, `clear_property`
- `create_task`
- `send_email`
- `add_note`
- `rotate_owner`, `assign_owner`
- `associate_object`, `disassociate_object`
- `create_ticket`, `update_ticket`
- `webhook_call`
- `delay`

**Hard Rules**
- All actions emit Activities; no direct Activity writes.
- No hidden mutations; failures log Activities.

---

## 7) Workflow Steps & Execution (Deterministic)
```prisma
model WorkflowStep {
  id          String   @id @default(uuid())
  workflowId  String
  type        String   // trigger | condition | action | delay | branch
  config      Json
  order       Int      @default(0)
}

model WorkflowExecution {
  id           String    @id @default(uuid())
  workflowId   String
  enrollmentId String
  stepId       String
  startedAt    DateTime  @default(now())
  completedAt  DateTime?
  status       String    // success | failed | skipped
  error        String?

  workflow     Workflow          @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  enrollment   WorkflowEnrollment @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)
  step         WorkflowStep      @relation(fields: [stepId], references: [id], onDelete: Cascade)
}
```
- Executions are append-only; retries only where idempotent.
- Delay actions persist execution state; deterministic wake-ups.

---

## 8) Loop & Safety Controls
- Re-enrollment suppression window.
- Max execution depth per workflow.
- Idempotency keys per step.
- Kill switches: global pause, per-workflow pause, per-object exit.

---

## 9) Email in Automation (Parity)
- Uses same send + log pipeline as CRM; `externalMessageId` required.
- Threads via headers; opens/clicks emit Activities.
- Opt-out respected at send-time.

---

## 10) Time & Delay Model
```prisma
model WorkflowDelayState {
  id           String   @id @default(uuid())
  workflowId   String
  enrollmentId String
  stepId       String
  wakeAt       DateTime
  type         String   // fixed | until_date | until_condition
  config       Json
  createdAt    DateTime @default(now())

  workflow     Workflow          @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  enrollment   WorkflowEnrollment @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)
  step         WorkflowStep      @relation(fields: [stepId], references: [id], onDelete: Cascade)
}
```
- Delays persist state; wake-ups are event-driven or scheduled safely; no drift/duplication.

---

## 11) Permissions & Governance
- Workflow edit: `automation.write` scope.
- Workflow view: `automation.read` scope.
- Execution logs: read-only.
- Actions respect object/property permissions; no workflow can exceed user authority.

---

## 12) Auditability (Mandatory)
- Every automation effect traceable via: enrollment Activities, action Activities, execution records, property history.
- If it cannot be proven later, it did not happen.

---

## 13) Guarantees
- Contacts remain the system anchor; single immutable Activity store.
- Automation is stateless between steps (except persisted delay state).
- No hidden side effects; all effects emit Activities.
- Fully reconstructable execution history.
- HubSpot Workflows parity achieved.
