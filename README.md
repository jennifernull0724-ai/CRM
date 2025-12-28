# T-REX CRM

**Deal-Centric Customer Relationship Management for Construction, Railroad & Environmental Industries**

## Overview

T-REX CRM is a production-ready, deal-centric CRM system built specifically for regulated industries. It combines contact management, deal tracking, built-in estimating, and compliance management in a single platform.

## Tech Stack (Locked)

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL (Neon for production)
- **ORM**: Prisma 7
- **Storage**: Google Cloud Storage
- **Authentication**: NextAuth.js
- **Payments**: Stripe
- **Deployment**: Vercel

## System Architecture

### Core Principles

1. **Deal-Centric**: Estimating lives inside deals, not as a separate entity
2. **Contact-Anchored**: Everything must attach to a Contact or Deal
3. **Audit-Ready**: Append-only activity logs, immutable PDFs, version control
4. **HubSpot-Parity**: Industry-standard CRM workflow with deal pipeline
5. **Zero Mock Data**: Production system only, no fake data

### Data Models

#### User
- Email, name, password (hashed)
- Roles: user, estimator, admin, owner
- Stripe customer integration for subscriptions

#### Contact (System Anchor)
- Identity: First name, last name, email (required, unique)
- Company association
- Contact owner (User)
- Last activity timestamp (auto-updated)
- Archived flag

#### Deal (Estimating Container)
- Stages: New, Qualifying, Estimating, Proposal Sent, Negotiation, Won, Lost
- Contact-anchored (required)
- Assigned estimator
- Version control for estimates
- Approval workflow

#### DealVersion
- Version number
- Line items snapshot
- Approval metadata
- Generated PDFs

#### DealLineItem
- Categories: Labor, Equipment, Materials, Subcontractors, Railroad, Environmental, Misc
- Quantity, unit, unit price
- Server-calculated totals

#### Activity (Append-Only)
- Types: CONTACT_CREATED, TASK_COMPLETED, CALL, MEETING, EMAIL_SENT, DEAL_CREATED, PDF_GENERATED, etc.
- Immutable audit trail
- Contact or Deal anchored

#### Task
- Execution engine for contact/deal work
- Due dates, priority, assignment
- Completion logging with activity

#### Note
- Rich text support
- @mentions with autocomplete
- Notification system

#### Compliance Models
- Employee (with QR tokens)
- Certification (with proof files)
- Company documents
- QR scan logs

## Installation & Setup

### Prerequisites
```bash
Node.js 20+
PostgreSQL (or Neon account)
Google Cloud Storage account
Stripe account
```

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://username:password@hostname:5432/database"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here-change-in-production"

# Google Cloud Storage
GCS_PROJECT_ID="your-project-id"
GCS_BUCKET_NAME="your-bucket-name"
GCS_SERVICE_ACCOUNT_KEY="base64-encoded-service-account-json"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Email ingestion (server-only)

Owner/Admin-only trigger:

```bash
EMAIL_INGESTION_SCHEDULER_KEY=your_key npx ts-node scripts/runEmailIngestion.ts
```

## Current Implementation Status

### Completed ✅
- Next.js project setup with TypeScript and Tailwind CSS
- Prisma schema with all required models
- Neon database adapter configuration
- Google Cloud Storage integration (dependencies)
- Landing page
- Contact list with search/filters
- Contact creation page
- Contact detail command center (basic)
- Deal pipeline view
- User dashboard
- Navigation component
- Build configuration for Vercel

### Requires Full Implementation 🔄

1. **Authentication System** - NextAuth configuration, signup with Stripe, login/logout
2. **Contact Module Complete** - Bulk import, task management, @mentions, activity logging, email integration
3. **Deal/Estimating Module Complete** - Line items, presets, versioning, approval, PDF generation
4. **Compliance Module** - Full implementation per specification
5. **Settings Module** - CRM settings, estimating templates, user management
6. **API Routes** - Complete REST API implementation
7. **Email Integration** - Gmail/Outlook OAuth, sending, logging
8. **File Upload/Download** - Google Cloud Storage integration

## Permissions Matrix

| Action | User | Estimator | Admin | Owner |
|--------|------|-----------|-------|-------|
| Create Contact | ✅ | ✅ | ✅ | ✅ |
| Edit Own Contact | ✅ | ✅ | ✅ | ✅ |
| Edit Others | ❌ | ❌ | ✅ | ✅ |
| Create Deal | ✅ | ✅ | ✅ | ✅ |
| Edit Pricing | ❌ | ✅ | ✅ | ✅ |
| Approve Deal | ❌ | ✅ | ✅ | ✅ |
| Email Approved PDF | ✅ | ✅ | ✅ | ✅ |
| Access Compliance | ❌ | ❌ | ✅ | ✅ |
| Manage Users | ❌ | ❌ | ✅ | ✅ |

## Deployment

### Vercel Deployment

1. Push code to GitHub
2. Connect repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy

### Neon Database Setup

1. Create Neon project
2. Copy connection string to `DATABASE_URL`
3. Run migrations: `npx prisma migrate deploy`

### Google Cloud Storage Setup

1. Create GCS bucket
2. Create service account with Storage Admin role
3. Download JSON key
4. Base64 encode: `cat key.json | base64`
5. Set as `GCS_SERVICE_ACCOUNT_KEY`

## License

Proprietary - For purchase and deployment by authorized users only.

---

**Built for Construction, Railroad & Environmental industries with compliance and audit requirements.**
