# HubSpot Companies Layer — Firmographic Context (Authoritative)

**Depends on**: Contacts (system anchor), Activities (immutable spine), Nav/Router architecture (permission-gated).
**Deliverable**: Authoritative schema and rules for Companies. Companies are contextual; Contacts remain the sole history anchor.

---

## 1. Role of Companies (Non-Negotiable)
- Provide firmographic context (domain, industry, size) and grouping for Contacts.
- Support reporting, segmentation, automation triggers (outside this doc).
- Act as association hubs.
- **Do not** own activities, timelines, or become anchors. History stays with Contacts.

---

## 2. Company Core Object (Base Table)
```prisma
model Company {
  id             String    @id @default(uuid())
  name           String
  domain         String?   // normalized: lowercase, punycode
  ownerId        String?
  lifecycleStage String    @default("prospect") // prospect, customer, churned, etc.
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  archivedAt     DateTime?

  // Relations
  contacts       CompanyContactAssociation[]
  properties     CompanyProperty[]
}
```

**Hard Rules**
- Companies are mutable; soft-delete only (`archivedAt`).
- No embedded history columns beyond base schema.
- No company-owned timelines or activity tables.

---

## 3. Company Property System (Dynamic, Identical to Contacts)
**Current Values**
```prisma
model CompanyProperty {
  id          String   @id @default(uuid())
  companyId   String
  propertyKey String
  value       String
  updatedAt   DateTime @default(now())

  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([companyId, propertyKey])
  @@index([companyId])
}
```

**History (Immutable)**
```prisma
model CompanyPropertyHistory {
  id          String   @id @default(uuid())
  companyId   String
  propertyKey String
  oldValue    String?
  newValue    String?
  changedBy   String?
  activityId  String
  changedAt   DateTime @default(now())

  company     Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@index([companyId])
  @@index([activityId])
}
```

**Rules**
- Firmographic fields beyond the base are dynamic properties.
- Every property write emits a `company_property_changed` **Contact-anchored Activity**.
- History is append-only; no overwrites of history rows.

---

## 4. Company ↔ Contact Associations (Core)
```prisma
model CompanyContactAssociation {
  id          String    @id @default(uuid())
  companyId   String
  contactId   String
  isPrimary   Boolean   @default(false)
  role        String?
  createdAt   DateTime  @default(now())
  archivedAt  DateTime?

  company     Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)
  contact     Contact   @relation(fields: [contactId], references: [id], onDelete: Cascade)

  @@unique([companyId, contactId])
  @@index([companyId])
  @@index([contactId])
  @@index([companyId, isPrimary])
}
```

**Enforcement Rules**
- Company may have zero or more Contacts; Contact may belong to multiple Companies.
- At most one `isPrimary = true` per Company.
- Removal = soft delete (`archivedAt`).
- Every create/update/remove emits a **Contact Activity**: `company_contact_added`, `company_contact_removed`, `company_primary_contact_changed`.

---

## 5. Company-Related Activities (Contact-Owned)
Companies never store Activities. Activities are emitted to Contacts.

**Activity Types (subtypes) anchored to Contact:**
- `company_created`
- `company_updated`
- `company_archived`
- `company_property_changed`
- `company_contact_added`
- `company_contact_removed`
- `company_primary_contact_changed`
- `company_merged`

**Rule**: No Company event exists without a Contact target. If a Company has no Contacts, events are queued and emitted once a Contact is associated.

---

## 6. Company Timeline (Projected Only)
No company timeline table. Derived projection:
```
CompanyTimeline(companyId) =
  SELECT a.*
  FROM activities a
  JOIN company_contact_association cca
    ON cca.company_id = companyId
   AND cca.contact_id = a.contact_id
  WHERE a.created_at BETWEEN cca.created_at AND COALESCE(cca.archived_at, NOW())
  ORDER BY a.created_at DESC;
```
- Time-scoped by association window.
- Zero duplication; fully reconstructable from Activities.

---

## 7. Deduplication & Merge
**Dedup Keys**
- Primary: normalized domain
- Secondary (optional): name + address

**Merge Behavior**
- Target company survives; source archived (soft).
- Properties merged; history preserved in `CompanyPropertyHistory` + Activity log.
- Associations unified.
- `company_merged` Activity emitted to all affected Contacts.

---

## 8. Permissions Model
- Read Company: requires Company read **or** Contact read for an associated Contact.
- Write Company: requires Company write.
- Manage associations: requires Company + Contact scopes.
- Property-level: same model as Contacts; checked before mutation.
- UI cannot bypass gates; permission enforcement occurs pre-render (router → gate → load → render).

---

## 9. Nav & Routing (Parity)
Routes (permission-gated):
- `/companies`
- `/companies/new`
- `/companies/:companyId`

Rules:
- Routes load the Company App (object-first), not static pages.
- Nav derived from permissions only; no scope → no nav entry.
- Deep links are permission-checked before render.

---

## 10. Guarantees
- Contacts remain the sole history anchor.
- Single immutable Activity store; Companies do not own activities.
- Company has no timeline table; timelines are projections.
- Associations are evented and soft-archived only.
- Dynamic properties with append-only history and activity emission.
- Nav reflects permissions; never mutates CRM state.

---

## Compliance Checklist
- Contacts are anchor: ✅
- Activities immutable: ✅
- Company has no timeline: ✅
- Associations evented: ✅
- Dynamic properties with history: ✅
- Nav permission-derived: ✅

**Document: HUBSPOT_COMPANIES_LAYER_SCHEMA.md (authoritative)**
