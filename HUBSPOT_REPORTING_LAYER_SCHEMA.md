# HubSpot Reporting Layer — Analytics (Authoritative)

**Depends on**: Contacts (anchor), Companies, Deals, Tickets, Activities (immutable), Properties (dynamic), Automation.  
**Deliverable**: HUBSPOT_REPORTING_LAYER_SCHEMA.md

---

## 1) Role of Reporting (Non-Negotiable)
- Reporting never creates or mutates truth.
- Inputs: immutable Activities + current property snapshots.
- Outputs: aggregations, metrics, visualizations.
- Storage: derived-only (materialized views allowed), always rebuildable.
- Reporting answers questions; it never changes the system.

---

## 2) Data Sources (Locked)
**Primary Sources**
- Activity stream (single immutable event store)
- Current object tables: Contact, Company, Deal, Ticket
- Dynamic property snapshots (current values) with lineage to Activities

**Forbidden Sources**
- Cached timelines
- UI state
- Automation execution shortcuts
- “Last known” summary tables without lineage

---

## 3) Report Types (HubSpot Parity)
**A. Object Reports**
- Contacts by lifecycle stage
- Companies by industry
- Deals by pipeline/stage
- Tickets by status/priority

**B. Activity Reports**
- Notes created
- Emails sent/received
- Calls logged
- Meetings held
- Tasks completed
- SLA events (breached, met)

**C. Funnel Reports**
- Contact lifecycle funnel
- Deal pipeline funnel
- Ticket resolution funnel

**D. Time-Series**
- Activity volume over time
- Conversion rates
- Response time trends
- SLA performance over time

**E. Attribution**
- First-touch / last-touch
- Deal source attribution
- Ticket origin attribution

All computed from Activities + properties.

---

## 4) Report Definition Model (Declarative)
```prisma
model Report {
  id             String   @id @default(uuid())
  name           String
  type           String   // object | activity | funnel | timeseries | attribution
  definition     Json     // filters, metrics, groupings
  visualization  String   // table | bar | line | pie | funnel
  createdBy      String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```
- Reports are mutable; executions are not.

---

## 5) Report Execution Model
```prisma
model ReportExecution {
  id             String   @id @default(uuid())
  reportId       String
  executedAt     DateTime @default(now())
  parameters     Json?
  resultLocation String   // pointer to result set (e.g., temp table/object store key)
  durationMs     Int?

  report         Report   @relation(fields: [reportId], references: [id], onDelete: Cascade)

  @@index([reportId, executedAt])
}
```
- Execution results may be cached; cache is disposable.
- No execution mutates source data.

---

## 6) Metric Definitions (Strict)
- Metrics are pure functions over Activities + properties.
- Examples:
  - `COUNT(activities WHERE type = 'email_sent')`
  - `AVG(ticket.resolutionTime)` (derived from activity timestamps)
  - `SUM(deal.amount WHERE stage = 'closed_won')`
- No metric may write data, trigger automation, or emit Activities.

---

## 7) Filtering & Segmentation
- Filters operate on: properties, associations, activity existence/count.
- Supports AND/OR groups, time windows, relative dates.
- Evaluation is read-only.
- Segments reusable by reports, automation conditions, lists.

---

## 8) Dashboards (Composition Only)
```prisma
model Dashboard {
  id         String   @id @default(uuid())
  name       String
  ownerId    String
  sharedWith Json?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```
- Dashboards contain Reports; contain no logic.
- Permissions enforced per widget/report.

---

## 9) Permissions
- Report view → `reporting.read`
- Report edit → `reporting.write`
- Dashboard view → derived from report access
- Data access always respects underlying object permissions.

---

## 10) Materialization (Optional, Safe)
- Allowed: materialized views, columnar stores.
- Must be rebuildable from Activities + properties, versioned, verifiable.
- No write-back to source tables.

---

## 11) Guarantees
- Single source of truth remains untouched.
- All insights are reproducible; no hidden state.
- No reporting side effects.
- HubSpot Reporting parity achieved.
