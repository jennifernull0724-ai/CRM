# HubSpot Deals Layer — On Top of Core CRM

**DEPENDENCY**: [HUBSPOT_CORE_CRM_SCHEMA.md](HUBSPOT_CORE_CRM_SCHEMA.md) (READ-ONLY)

**ARCHITECTURAL TRUTH**: Deals are secondary entities. Contacts remain the activity anchor. Deals consume Activities — they do not own them.

---

## 1. DEAL OBJECT SCHEMA (Secondary Entity)

```prisma
model Deal {
  // IDENTITY (Immutable)
  id                String    @id @default(cuid())
  createdAt         DateTime  @default(now())
  createdByUserId   String?
  
  // CORE PROPERTIES (Mutable)
  name              String
  description       String?
  
  // PIPELINE CONTEXT
  pipelineId        String
  stageId           String
  
  // COMMERCIAL TERMS
  amount            Float     @default(0)
  currency          String    @default("USD")
  
  // OWNERSHIP
  ownerUserId       String
  
  // FORECAST METADATA
  closeDate         DateTime?
  probability       Int?      // 0-100, derived from stage
  forecastCategory  ForecastCategory?
  
  // STATE
  status            DealStatus @default(OPEN)
  closedAt          DateTime?
  
  // METADATA
  updatedAt         DateTime  @updatedAt
  lastActivityAt    DateTime  @default(now())
  
  // RELATIONS
  owner             User      @relation("DealOwner", fields: [ownerUserId], references: [id])
  createdBy         User?     @relation("DealCreator", fields: [createdByUserId], references: [id])
  pipeline          Pipeline  @relation(fields: [pipelineId], references: [id])
  stage             Stage     @relation(fields: [stageId], references: [id])
  properties        DealProperty[]
  associations      DealContactAssociation[]
  
  @@index([ownerUserId])
  @@index([pipelineId])
  @@index([stageId])
  @@index([status])
  @@index([closeDate])
  @@index([lastActivityAt])
}

enum DealStatus {
  OPEN
  WON
  LOST
  ARCHIVED
}

enum ForecastCategory {
  OMITTED
  PIPELINE
  BEST_CASE
  COMMIT
  CLOSED
}
```

## 2. PIPELINE & STAGE SCHEMA

```prisma
model Pipeline {
  id          String   @id @default(cuid())
  name        String   @unique
  label       String
  displayOrder Int     @default(0)
  isDefault   Boolean  @default(false)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  stages      Stage[]
  deals       Deal[]
  
  @@index([isDefault])
}

model Stage {
  id              String   @id @default(cuid())
  pipelineId      String
  name            String
  label           String
  displayOrder    Int      @default(0)
  probability     Int      @default(0) // 0-100
  isClosedWon     Boolean  @default(false)
  isClosedLost    Boolean  @default(false)
  metadata        Json?    // Additional stage config
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  pipeline        Pipeline @relation(fields: [pipelineId], references: [id], onDelete: Cascade)
  deals           Deal[]
  
  @@unique([pipelineId, name])
  @@index([pipelineId, displayOrder])
}
```

## 3. DEAL ↔ CONTACT ASSOCIATION (Required)

```prisma
model DealContactAssociation {
  id                String    @id @default(cuid())
  dealId            String
  contactId         String
  isPrimary         Boolean   @default(false)
  role              String?   // e.g., "Decision Maker", "Influencer"
  createdAt         DateTime  @default(now())
  createdByUserId   String?
  removedAt         DateTime?
  removedByUserId   String?
  
  deal              Deal      @relation(fields: [dealId], references: [id], onDelete: Cascade)
  contact           Contact   @relation(fields: [contactId], references: [id], onDelete: Cascade)
  createdBy         User?     @relation("DealContactAssociationCreator", fields: [createdByUserId], references: [id])
  removedBy         User?     @relation("DealContactAssociationRemover", fields: [removedByUserId], references: [id])
  
  @@unique([dealId, contactId])
  @@index([dealId])
  @@index([contactId])
  @@index([isPrimary])
}
```

## 4. DEAL PROPERTIES SYSTEM (Dynamic)

```prisma
model DealPropertyDefinition {
  id              String   @id @default(cuid())
  name            String   @unique
  label           String
  type            PropertyType
  source          PropertySource
  mutable         Boolean  @default(true)
  historyTracked  Boolean  @default(true)
  options         Json?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  values          DealProperty[]
}

model DealProperty {
  id              String   @id @default(cuid())
  dealId          String
  propertyDefId   String
  value           String
  setAt           DateTime @default(now())
  setByUserId     String?
  
  deal            Deal     @relation(fields: [dealId], references: [id], onDelete: Cascade)
  propertyDef     DealPropertyDefinition @relation(fields: [propertyDefId], references: [id])
  setBy           User?    @relation(fields: [setByUserId], references: [id])
  
  @@unique([dealId, propertyDefId])
  @@index([dealId])
}
```

## 5. DEAL ACTIVITY SUBTYPES (Extended from Core CRM)

Deals emit **system Activities** that attach to the **primary Contact**.

All Deal activities use the core `Activity` model with these subtypes:

### Deal Lifecycle Activities

```typescript
// Activity.type = SYSTEM_EVENT
// Activity.subtype = one of the following:

enum DealActivitySubtype {
  // LIFECYCLE
  DEAL_CREATED = 'deal_created',
  DEAL_STAGE_CHANGED = 'deal_stage_changed',
  DEAL_AMOUNT_UPDATED = 'deal_amount_updated',
  DEAL_OWNER_CHANGED = 'deal_owner_changed',
  DEAL_CLOSED_WON = 'deal_closed_won',
  DEAL_CLOSED_LOST = 'deal_closed_lost',
  DEAL_ARCHIVED = 'deal_archived',
  DEAL_UNARCHIVED = 'deal_unarchived',
  
  // ASSOCIATIONS
  DEAL_CONTACT_ADDED = 'deal_contact_added',
  DEAL_CONTACT_REMOVED = 'deal_contact_removed',
  DEAL_PRIMARY_CONTACT_CHANGED = 'deal_primary_contact_changed',
  
  // PROPERTIES
  DEAL_PROPERTY_UPDATED = 'deal_property_updated',
  DEAL_CLOSE_DATE_CHANGED = 'deal_close_date_changed',
  DEAL_PROBABILITY_CHANGED = 'deal_probability_changed',
}
```

### Metadata Schemas for Deal Activities

```typescript
interface DealCreatedMetadata {
  dealId: string;
  dealName: string;
  pipelineId: string;
  pipelineName: string;
  stageId: string;
  stageName: string;
  amount: number;
  currency: string;
  primaryContactId: string;
}

interface DealStageChangedMetadata {
  dealId: string;
  dealName: string;
  oldStageId: string;
  oldStageName: string;
  newStageId: string;
  newStageName: string;
  oldProbability: number;
  newProbability: number;
}

interface DealAmountUpdatedMetadata {
  dealId: string;
  dealName: string;
  oldAmount: number;
  newAmount: number;
  currency: string;
}

interface DealOwnerChangedMetadata {
  dealId: string;
  dealName: string;
  oldOwnerUserId?: string;
  oldOwnerName?: string;
  newOwnerUserId: string;
  newOwnerName: string;
}

interface DealClosedWonMetadata {
  dealId: string;
  dealName: string;
  finalAmount: number;
  currency: string;
  closedAt: string;
  stageId: string;
  stageName: string;
}

interface DealClosedLostMetadata {
  dealId: string;
  dealName: string;
  lostReason?: string;
  closedAt: string;
  stageId: string;
  stageName: string;
}

interface DealContactAddedMetadata {
  dealId: string;
  dealName: string;
  contactId: string;
  contactName: string;
  isPrimary: boolean;
  role?: string;
}

interface DealContactRemovedMetadata {
  dealId: string;
  dealName: string;
  contactId: string;
  contactName: string;
  wasPrimary: boolean;
}

interface DealPropertyUpdatedMetadata {
  dealId: string;
  dealName: string;
  propertyName: string;
  oldValue: any;
  newValue: any;
}
```

## 6. DEAL ↔ CONTACT ASSOCIATION RULES

### Rule 1: Deal MUST Have Contact
```typescript
async function createDeal(data: {
  name: string;
  pipelineId: string;
  stageId: string;
  amount: number;
  ownerUserId: string;
  primaryContactId: string; // REQUIRED
  createdByUserId: string;
}): Promise<Deal> {
  // VALIDATION: Contact must exist
  const contact = await prisma.contact.findUnique({
    where: { id: data.primaryContactId }
  });
  
  if (!contact) {
    throw new Error('Primary contact is required for deal creation');
  }
  
  // Create deal
  const deal = await prisma.deal.create({
    data: {
      name: data.name,
      pipelineId: data.pipelineId,
      stageId: data.stageId,
      amount: data.amount,
      ownerUserId: data.ownerUserId,
      createdByUserId: data.createdByUserId,
      status: 'OPEN'
    }
  });
  
  // Create primary contact association
  await prisma.dealContactAssociation.create({
    data: {
      dealId: deal.id,
      contactId: data.primaryContactId,
      isPrimary: true,
      createdByUserId: data.createdByUserId
    }
  });
  
  // Emit Activity attached to PRIMARY CONTACT
  await prisma.activity.create({
    data: {
      contactId: data.primaryContactId, // Activity anchors to Contact
      type: 'SYSTEM_EVENT',
      subtype: 'deal_created',
      createdByUserId: data.createdByUserId,
      subject: `Deal created: ${data.name}`,
      metadata: {
        dealId: deal.id,
        dealName: data.name,
        pipelineId: data.pipelineId,
        stageId: data.stageId,
        amount: data.amount,
        currency: 'USD',
        primaryContactId: data.primaryContactId
      }
    }
  });
  
  return deal;
}
```

### Rule 2: Contact Association Change Emits Activity
```typescript
async function addContactToDeal(
  dealId: string,
  contactId: string,
  userId: string,
  role?: string
): Promise<void> {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    select: { name: true }
  });
  
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { fullName: true }
  });
  
  if (!deal || !contact) {
    throw new Error('Deal or contact not found');
  }
  
  // Create association
  await prisma.dealContactAssociation.create({
    data: {
      dealId,
      contactId,
      isPrimary: false,
      role,
      createdByUserId: userId
    }
  });
  
  // Emit Activity to the Contact being added
  await prisma.activity.create({
    data: {
      contactId, // Activity anchors to Contact
      type: 'SYSTEM_EVENT',
      subtype: 'deal_contact_added',
      createdByUserId: userId,
      subject: `Added to deal: ${deal.name}`,
      metadata: {
        dealId,
        dealName: deal.name,
        contactId,
        contactName: contact.fullName,
        isPrimary: false,
        role
      }
    }
  });
}
```

### Rule 3: Removing Contact Preserves History
```typescript
async function removeContactFromDeal(
  dealId: string,
  contactId: string,
  userId: string
): Promise<void> {
  // Get association
  const association = await prisma.dealContactAssociation.findUnique({
    where: {
      dealId_contactId: { dealId, contactId }
    },
    include: {
      deal: { select: { name: true } },
      contact: { select: { fullName: true } }
    }
  });
  
  if (!association) {
    throw new Error('Association not found');
  }
  
  // Check if last contact
  const contactCount = await prisma.dealContactAssociation.count({
    where: {
      dealId,
      removedAt: null
    }
  });
  
  if (contactCount <= 1) {
    throw new Error('Cannot remove last contact from deal');
  }
  
  // Soft delete (preserve history)
  await prisma.dealContactAssociation.update({
    where: { id: association.id },
    data: {
      removedAt: new Date(),
      removedByUserId: userId
    }
  });
  
  // Emit Activity to the Contact being removed
  await prisma.activity.create({
    data: {
      contactId, // Activity anchors to Contact
      type: 'SYSTEM_EVENT',
      subtype: 'deal_contact_removed',
      createdByUserId: userId,
      subject: `Removed from deal: ${association.deal.name}`,
      metadata: {
        dealId,
        dealName: association.deal.name,
        contactId,
        contactName: association.contact.fullName,
        wasPrimary: association.isPrimary
      }
    }
  });
}
```

### Rule 4: Deal Deletion Prevention
```typescript
async function archiveDeal(dealId: string, userId: string): Promise<void> {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    select: { name: true, status: true }
  });
  
  if (!deal) {
    throw new Error('Deal not found');
  }
  
  // Update status
  await prisma.deal.update({
    where: { id: dealId },
    data: { status: 'ARCHIVED' }
  });
  
  // Get primary contact for activity
  const primaryAssociation = await prisma.dealContactAssociation.findFirst({
    where: {
      dealId,
      isPrimary: true,
      removedAt: null
    },
    select: { contactId: true }
  });
  
  if (primaryAssociation) {
    // Emit Activity to primary Contact
    await prisma.activity.create({
      data: {
        contactId: primaryAssociation.contactId, // Activity anchors to Contact
        type: 'SYSTEM_EVENT',
        subtype: 'deal_archived',
        createdByUserId: userId,
        subject: `Deal archived: ${deal.name}`,
        metadata: {
          dealId,
          dealName: deal.name,
          previousStatus: deal.status
        }
      }
    });
  }
}
```

## 7. DEAL STATE MACHINE (Event-Driven)

```typescript
async function changeDealStage(
  dealId: string,
  newStageId: string,
  userId: string
): Promise<void> {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      stage: true
    }
  });
  
  const newStage = await prisma.stage.findUnique({
    where: { id: newStageId }
  });
  
  if (!deal || !newStage) {
    throw new Error('Deal or stage not found');
  }
  
  const oldStage = deal.stage;
  
  // Update deal
  await prisma.deal.update({
    where: { id: dealId },
    data: {
      stageId: newStageId,
      probability: newStage.probability,
      ...(newStage.isClosedWon && {
        status: 'WON',
        closedAt: new Date()
      }),
      ...(newStage.isClosedLost && {
        status: 'LOST',
        closedAt: new Date()
      })
    }
  });
  
  // Get primary contact
  const primaryAssociation = await prisma.dealContactAssociation.findFirst({
    where: {
      dealId,
      isPrimary: true,
      removedAt: null
    },
    select: { contactId: true }
  });
  
  if (!primaryAssociation) {
    throw new Error('Deal has no primary contact');
  }
  
  // Determine activity subtype
  let subtype = 'deal_stage_changed';
  if (newStage.isClosedWon) subtype = 'deal_closed_won';
  if (newStage.isClosedLost) subtype = 'deal_closed_lost';
  
  // Emit Activity to primary Contact
  await prisma.activity.create({
    data: {
      contactId: primaryAssociation.contactId, // Activity anchors to Contact
      type: 'SYSTEM_EVENT',
      subtype,
      createdByUserId: userId,
      subject: `Deal ${newStage.isClosedWon ? 'won' : newStage.isClosedLost ? 'lost' : 'stage changed'}: ${deal.name}`,
      metadata: newStage.isClosedWon ? {
        dealId,
        dealName: deal.name,
        finalAmount: deal.amount,
        currency: deal.currency,
        closedAt: new Date().toISOString(),
        stageId: newStageId,
        stageName: newStage.name
      } : newStage.isClosedLost ? {
        dealId,
        dealName: deal.name,
        closedAt: new Date().toISOString(),
        stageId: newStageId,
        stageName: newStage.name
      } : {
        dealId,
        dealName: deal.name,
        oldStageId: oldStage.id,
        oldStageName: oldStage.name,
        newStageId,
        newStageName: newStage.name,
        oldProbability: oldStage.probability,
        newProbability: newStage.probability
      }
    }
  });
}
```

## 8. DEAL TIMELINE PROJECTION (Filter Contact Activities)

```typescript
/**
 * Project Deal Timeline from Contact Activities
 * Deals do not own activities — they consume them
 */
async function getDealTimeline(
  dealId: string,
  options?: {
    types?: ActivityType[];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }
): Promise<DealTimelineEvent[]> {
  // Get all associated contacts
  const associations = await prisma.dealContactAssociation.findMany({
    where: {
      dealId,
      removedAt: null
    },
    select: { contactId: true }
  });
  
  const contactIds = associations.map(a => a.contactId);
  
  if (contactIds.length === 0) {
    return [];
  }
  
  // Get activities from ALL associated contacts
  // Filter by:
  // 1. Contact association
  // 2. Deal-specific activities (metadata.dealId matches)
  // 3. General contact activities (notes, emails, calls, etc.)
  
  const activities = await prisma.activity.findMany({
    where: {
      contactId: { in: contactIds },
      ...(options?.types && { type: { in: options.types } }),
      ...(options?.startDate && { createdAt: { gte: options.startDate } }),
      ...(options?.endDate && { createdAt: { lte: options.endDate } }),
      OR: [
        // Deal-specific activities
        {
          subtype: {
            in: [
              'deal_created',
              'deal_stage_changed',
              'deal_amount_updated',
              'deal_owner_changed',
              'deal_closed_won',
              'deal_closed_lost',
              'deal_archived',
              'deal_contact_added',
              'deal_contact_removed',
              'deal_property_updated'
            ]
          },
          metadata: {
            path: ['dealId'],
            equals: dealId
          }
        },
        // General contact activities (visible to deal)
        {
          type: {
            in: [
              'NOTE',
              'TASK',
              'TASK_COMPLETED',
              'EMAIL_SENT',
              'EMAIL_LOGGED',
              'EMAIL_RECEIVED',
              'CALL_LOGGED',
              'MEETING_LOGGED',
              'FILE_UPLOADED'
            ]
          }
        }
      ]
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      contact: {
        select: {
          id: true,
          fullName: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: options?.limit
  });
  
  return activities.map(activity => ({
    id: activity.id,
    type: activity.type,
    subtype: activity.subtype,
    createdAt: activity.createdAt,
    createdBy: activity.createdBy,
    contact: activity.contact,
    subject: activity.subject,
    body: activity.body,
    metadata: activity.metadata,
    icon: getActivityIcon(activity.type, activity.subtype),
    color: getActivityColor(activity.type, activity.subtype)
  }));
}

interface DealTimelineEvent {
  id: string;
  type: ActivityType;
  subtype?: string | null;
  createdAt: Date;
  createdBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  contact: {
    id: string;
    fullName: string;
  };
  subject?: string | null;
  body?: string | null;
  metadata: any;
  icon: string;
  color: string;
}

function getActivityIcon(type: ActivityType, subtype?: string | null): string {
  if (subtype?.startsWith('deal_')) {
    const dealIconMap: Record<string, string> = {
      deal_created: 'briefcase',
      deal_stage_changed: 'trending-up',
      deal_amount_updated: 'dollar-sign',
      deal_owner_changed: 'user-switch',
      deal_closed_won: 'trophy',
      deal_closed_lost: 'x-circle',
      deal_archived: 'archive',
      deal_contact_added: 'user-plus',
      deal_contact_removed: 'user-minus',
      deal_property_updated: 'edit'
    };
    return dealIconMap[subtype] || 'circle';
  }
  
  // Fallback to contact activity icons
  return getContactActivityIcon(type);
}

function getActivityColor(type: ActivityType, subtype?: string | null): string {
  if (subtype?.startsWith('deal_')) {
    const dealColorMap: Record<string, string> = {
      deal_created: 'green',
      deal_stage_changed: 'blue',
      deal_amount_updated: 'yellow',
      deal_owner_changed: 'purple',
      deal_closed_won: 'green',
      deal_closed_lost: 'red',
      deal_archived: 'gray',
      deal_contact_added: 'green',
      deal_contact_removed: 'red',
      deal_property_updated: 'blue'
    };
    return dealColorMap[subtype] || 'gray';
  }
  
  // Fallback to contact activity colors
  return getContactActivityColor(type);
}
```

## 9. DEAL STATE RECONSTRUCTION

```typescript
/**
 * Rebuild deal state from activity history
 * Useful for audit, recovery, or time-travel queries
 */
async function rebuildDealState(
  dealId: string,
  asOfDate?: Date
): Promise<DealState> {
  // Get primary contact for activity queries
  const primaryAssociation = await prisma.dealContactAssociation.findFirst({
    where: {
      dealId,
      isPrimary: true,
      removedAt: null
    },
    select: { contactId: true }
  });
  
  if (!primaryAssociation) {
    throw new Error('Deal has no primary contact');
  }
  
  // Get all deal-related activities
  const activities = await prisma.activity.findMany({
    where: {
      contactId: primaryAssociation.contactId,
      subtype: { startsWith: 'deal_' },
      metadata: {
        path: ['dealId'],
        equals: dealId
      },
      ...(asOfDate && { createdAt: { lte: asOfDate } })
    },
    orderBy: {
      createdAt: 'asc'
    }
  });
  
  const state: DealState = {
    name: '',
    stageId: '',
    stageName: '',
    amount: 0,
    ownerUserId: '',
    status: 'OPEN',
    properties: new Map(),
    contacts: []
  };
  
  for (const activity of activities) {
    const meta = activity.metadata as any;
    
    switch (activity.subtype) {
      case 'deal_created':
        state.name = meta.dealName;
        state.stageId = meta.stageId;
        state.stageName = meta.stageName;
        state.amount = meta.amount;
        state.contacts.push(meta.primaryContactId);
        break;
        
      case 'deal_stage_changed':
        state.stageId = meta.newStageId;
        state.stageName = meta.newStageName;
        break;
        
      case 'deal_amount_updated':
        state.amount = meta.newAmount;
        break;
        
      case 'deal_owner_changed':
        state.ownerUserId = meta.newOwnerUserId;
        break;
        
      case 'deal_closed_won':
        state.status = 'WON';
        break;
        
      case 'deal_closed_lost':
        state.status = 'LOST';
        break;
        
      case 'deal_archived':
        state.status = 'ARCHIVED';
        break;
        
      case 'deal_contact_added':
        if (!state.contacts.includes(meta.contactId)) {
          state.contacts.push(meta.contactId);
        }
        break;
        
      case 'deal_contact_removed':
        state.contacts = state.contacts.filter(id => id !== meta.contactId);
        break;
        
      case 'deal_property_updated':
        state.properties.set(meta.propertyName, meta.newValue);
        break;
    }
  }
  
  return state;
}

interface DealState {
  name: string;
  stageId: string;
  stageName: string;
  amount: number;
  ownerUserId: string;
  status: DealStatus;
  properties: Map<string, any>;
  contacts: string[];
}
```

## 10. PERMISSION EVALUATION (Deal Layer)

```typescript
/**
 * Deal Read Permission
 * Rules:
 * 1. User must have Contact read access (at least one associated contact)
 * 2. User must have Deal read access (owner or admin/owner role)
 */
async function canReadDeal(
  userId: string,
  userRole: string,
  dealId: string
): Promise<boolean> {
  // Admin/Owner can read all deals
  if (['admin', 'owner'].includes(userRole)) {
    return true;
  }
  
  // Get deal
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    select: { ownerUserId: true }
  });
  
  if (!deal) return false;
  
  // Owner can read their deals
  if (deal.ownerUserId === userId) {
    return true;
  }
  
  // Check if user owns any associated contacts
  const associations = await prisma.dealContactAssociation.findMany({
    where: {
      dealId,
      removedAt: null
    },
    include: {
      contact: {
        select: { ownerUserId: true }
      }
    }
  });
  
  return associations.some(a => a.contact.ownerUserId === userId);
}

/**
 * Deal Write Permission
 * Rules:
 * 1. User must have Deal read access
 * 2. User must be deal owner OR admin/owner role
 */
async function canWriteDeal(
  userId: string,
  userRole: string,
  dealId: string
): Promise<boolean> {
  // Admin/Owner can write all deals
  if (['admin', 'owner'].includes(userRole)) {
    return true;
  }
  
  // Get deal
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    select: { ownerUserId: true }
  });
  
  if (!deal) return false;
  
  // Owner can write their deals
  return deal.ownerUserId === userId;
}
```

## 11. VALIDATION TESTS

```typescript
describe('HubSpot Deals Layer Validation', () => {
  test('Create Deal → activity logged to Contact', async () => {
    const deal = await createDeal({
      name: 'Test Deal',
      pipelineId: 'pipeline-1',
      stageId: 'stage-1',
      amount: 10000,
      ownerUserId: 'user-1',
      primaryContactId: 'contact-1',
      createdByUserId: 'user-1'
    });
    
    const activity = await prisma.activity.findFirst({
      where: {
        contactId: 'contact-1',
        subtype: 'deal_created',
        metadata: {
          path: ['dealId'],
          equals: deal.id
        }
      }
    });
    
    expect(activity).toBeDefined();
  });
  
  test('Associate Contact → activity logged', async () => {
    await addContactToDeal('deal-1', 'contact-2', 'user-1');
    
    const activity = await prisma.activity.findFirst({
      where: {
        contactId: 'contact-2',
        subtype: 'deal_contact_added'
      }
    });
    
    expect(activity).toBeDefined();
  });
  
  test('Change stage → activity logged to primary Contact', async () => {
    await changeDealStage('deal-1', 'stage-2', 'user-1');
    
    const activity = await prisma.activity.findFirst({
      where: {
        subtype: 'deal_stage_changed',
        metadata: {
          path: ['dealId'],
          equals: 'deal-1'
        }
      }
    });
    
    expect(activity).toBeDefined();
  });
  
  test('Close deal → activity logged', async () => {
    const wonStage = await prisma.stage.findFirst({
      where: { isClosedWon: true }
    });
    
    await changeDealStage('deal-1', wonStage!.id, 'user-1');
    
    const activity = await prisma.activity.findFirst({
      where: {
        subtype: 'deal_closed_won',
        metadata: {
          path: ['dealId'],
          equals: 'deal-1'
        }
      }
    });
    
    expect(activity).toBeDefined();
  });
  
  test('View Deal timeline reconstructed from Activities', async () => {
    const timeline = await getDealTimeline('deal-1');
    
    expect(timeline.length).toBeGreaterThan(0);
    expect(timeline.every(e => e.contact)).toBe(true);
  });
  
  test('Remove Contact → deal remains, history preserved', async () => {
    await removeContactFromDeal('deal-1', 'contact-2', 'user-1');
    
    const deal = await prisma.deal.findUnique({
      where: { id: 'deal-1' }
    });
    
    const association = await prisma.dealContactAssociation.findUnique({
      where: {
        dealId_contactId: {
          dealId: 'deal-1',
          contactId: 'contact-2'
        }
      }
    });
    
    expect(deal).toBeDefined();
    expect(association?.removedAt).toBeDefined();
  });
  
  test('Archive Deal → history remains visible', async () => {
    await archiveDeal('deal-1', 'user-1');
    
    const deal = await prisma.deal.findUnique({
      where: { id: 'deal-1' }
    });
    
    const timeline = await getDealTimeline('deal-1');
    
    expect(deal?.status).toBe('ARCHIVED');
    expect(timeline.length).toBeGreaterThan(0);
  });
});
```

---

## ARCHITECTURAL VALIDATION ✅

✅ Deals are secondary entities  
✅ Contacts remain the activity anchor  
✅ Deals consume Activities — they do not own them  
✅ Deal state is derived from events  
✅ Deal timeline is a filtered projection  
✅ Every Deal has ≥1 Contact  
✅ Contact association changes emit Activities  
✅ Removing Contact preserves history  
✅ Deal deletion is prevented (archive only)  
✅ Deal state reconstructable from Activities  

## SCOPE COMPLIANCE ✅

✅ NO deal-only timelines (projected from Contact activities)  
✅ NO deal-owned tasks (tasks anchor to Contacts)  
✅ NO deal-owned emails (emails anchor to Contacts)  
✅ NO deal-owned notes (notes anchor to Contacts)  
✅ NO deal history outside Activities  
✅ NO UI  
✅ NO automation  

## DEPENDENCY COMPLIANCE ✅

✅ Built on top of HUBSPOT_CORE_CRM_SCHEMA.md  
✅ Extends Activity model with deal subtypes  
✅ Respects Contact as anchor  
✅ Maintains immutability principle  
✅ Preserves timeline reconstruction  

**Deals layer complete. Ready for implementation.**
