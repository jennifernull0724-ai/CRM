# T-REX CRM Deployment Guide

## Overview

T-REX CRM is designed to be deployed on Vercel with a Neon PostgreSQL database and Google Cloud Storage for file management.

## Prerequisites

1. **Vercel Account** - https://vercel.com
2. **Neon Account** - https://neon.tech
3. **Google Cloud Platform Account** - https://cloud.google.com
4. **Stripe Account** - https://stripe.com
5. **GitHub Repository** - Code pushed to GitHub

## Step 1: Database Setup (Neon)

### Create Neon Project

1. Log into Neon (https://console.neon.tech)
2. Click "New Project"
3. Name: "trex-crm-production"
4. Region: Choose closest to your users
5. PostgreSQL Version: 16
6. Click "Create Project"

### Get Connection String

1. In your Neon project dashboard
2. Click "Connection Details"
3. Copy the connection string (it will look like):
   ```
   postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Save this for later as `DATABASE_URL`

### Run Migrations

```bash
# Set the DATABASE_URL environment variable
export DATABASE_URL="your-neon-connection-string"

# Run migrations
npx prisma migrate deploy

# Verify
npx prisma db pull
```

## Step 2: Google Cloud Storage Setup

### Create GCS Bucket

1. Go to Google Cloud Console (https://console.cloud.google.com)
2. Create a new project or select existing: "trex-crm"
3. Navigate to "Cloud Storage" > "Buckets"
4. Click "Create Bucket"
   - Name: `trex-crm-files` (must be globally unique)
   - Location: Multi-region (US, EU, or ASIA)
   - Storage class: Standard
   - Access control: Uniform
   - Public access: OFF (prevent public access)
5. Click "Create"

### Create Service Account

1. Navigate to "IAM & Admin" > "Service Accounts"
2. Click "Create Service Account"
   - Name: "trex-crm-storage"
   - Description: "Service account for T-REX CRM file uploads"
3. Click "Create and Continue"
4. Grant roles:
   - "Storage Admin" on your bucket
   - "Storage Object Admin"
5. Click "Continue" then "Done"

### Generate Service Account Key

1. Click on the service account you just created
2. Go to "Keys" tab
3. Click "Add Key" > "Create New Key"
4. Choose "JSON"
5. Download the JSON file
6. Base64 encode it:
   ```bash
   cat service-account-key.json | base64 > gcs-key-base64.txt
   ```
7. Save the base64 string for later as `GCS_SERVICE_ACCOUNT_KEY`

### Configure Bucket CORS (if needed)

Create `cors.json`:
```json
[
  {
    "origin": ["https://your-domain.com"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```

Apply CORS:
```bash
gsutil cors set cors.json gs://trex-crm-files
```

## Step 3: Stripe Setup

### Get API Keys

1. Log into Stripe Dashboard (https://dashboard.stripe.com)
2. Navigate to "Developers" > "API Keys"
3. Copy:
   - **Publishable key** (starts with `pk_`)
   - **Secret key** (starts with `sk_`)
4. Save these for later

### Create Products

1. Go to "Products" in Stripe Dashboard
2. Create pricing tiers:
   - **Starter**: $49/month
   - **Professional**: $99/month
   - **Enterprise**: $299/month
3. Note the Price IDs for each tier

### Setup Webhook

1. Go to "Developers" > "Webhooks"
2. Click "Add Endpoint"
3. URL: `https://your-domain.vercel.app/api/webhooks/stripe`
4. Events to listen to:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the "Signing secret" (starts with `whsec_`)

## Step 4: Vercel Deployment

### Connect Repository

1. Log into Vercel (https://vercel.com)
2. Click "Add New" > "Project"
3. Import your GitHub repository
4. Configure:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: .next
5. Don't deploy yet - configure environment variables first

### Environment Variables

In Vercel project settings > Environment Variables, add:

```bash
# Database
DATABASE_URL=postgresql://username:password@ep-xxx.neon.tech/neondb?sslmode=require

# NextAuth
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=<generate-with: openssl rand -base64 32>

# Google Cloud Storage
GCS_PROJECT_ID=trex-crm
GCS_BUCKET_NAME=trex-crm-files
GCS_SERVICE_ACCOUNT_KEY=<base64-encoded-json>

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (Optional - for Gmail/Outlook integration)
GMAIL_CLIENT_ID=your-gmail-client-id
GMAIL_CLIENT_SECRET=your-gmail-client-secret
OUTLOOK_CLIENT_ID=your-outlook-client-id
OUTLOOK_CLIENT_SECRET=your-outlook-client-secret
```

**Important:** Set all variables for "Production" environment.

### Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Verify deployment at your Vercel URL

### Custom Domain (Optional)

1. In Vercel project settings > "Domains"
2. Add your custom domain: `app.yourcompany.com`
3. Update DNS records as instructed
4. Update `NEXTAUTH_URL` to your custom domain
5. Redeploy

## Step 5: Post-Deployment Setup

### Create Initial Owner Account

1. Visit your deployed site
2. Click "Get Started" or navigate to `/signup`
3. Create first account with owner role
4. This requires temporarily allowing signup or creating via Prisma Studio

### Prisma Studio Access

For database management:
```bash
npx prisma studio
```

### Create Initial Data (Optional)

Run seed script to create:
- Sample company types
- Default settings
- Certification presets

```bash
npx prisma db seed
```

## Step 6: Monitoring & Maintenance

### Vercel Analytics

1. Enable in Vercel project settings
2. Monitor:
   - Page load times
   - Error rates
   - API response times

### Neon Monitoring

1. Check database metrics in Neon console
2. Monitor:
   - Connection count
   - Query performance
   - Storage usage

### GCS Monitoring

1. Check Google Cloud Console
2. Monitor:
   - Storage usage
   - Request counts
   - Bandwidth

### Error Tracking (Recommended)

Set up Sentry or similar:
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

## Security Checklist

- [ ] All environment variables set in Vercel (not in code)
- [ ] `.env` file in `.gitignore`
- [ ] Database has SSL enabled (Neon default)
- [ ] GCS bucket is private (no public access)
- [ ] Stripe webhooks use signature verification
- [ ] NEXTAUTH_SECRET is randomly generated and secure
- [ ] CORS configured correctly for production domain
- [ ] Rate limiting enabled on API routes
- [ ] User input validation on all forms
- [ ] SQL injection protection (Prisma ORM)
- [ ] XSS protection (React default escaping)

## Backup Strategy

### Database Backups

Neon provides automatic backups. Configure retention:
1. Neon Console > Your Project > Settings
2. Set backup retention period (7 days recommended)
3. Enable point-in-time recovery

### Manual Backup

```bash
# Export database
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Upload to secure storage
gsutil cp backup-$(date +%Y%m%d).sql gs://trex-crm-backups/
```

### File Backups

GCS has built-in versioning. Enable it:
```bash
gsutil versioning set on gs://trex-crm-files
```

## Scaling Considerations

### Database Scaling (Neon)

- Monitor query performance
- Add indexes as needed
- Use connection pooling (built into Neon)
- Upgrade plan if needed

### Application Scaling (Vercel)

- Vercel auto-scales based on traffic
- Monitor function execution times
- Optimize slow API routes
- Use edge functions for global performance

### Storage Scaling (GCS)

- GCS auto-scales
- Monitor costs
- Set up lifecycle policies to archive old files
- Implement CDN if serving many files

## Troubleshooting

### Build Failures

```bash
# Check build logs in Vercel
# Common issues:
- Missing environment variables
- TypeScript errors
- Database connection issues during build

# Solution: Ensure DATABASE_URL is set and pages use dynamic rendering
```

### Database Connection Issues

```bash
# Test connection
npx prisma db pull

# Check:
- Connection string format
- SSL mode (should be require)
- IP allowlist (Neon allows all by default)
```

### File Upload Issues

```bash
# Check:
- GCS credentials are correct
- Service account has proper permissions
- Bucket exists and is accessible
```

## Support & Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Vercel Docs**: https://vercel.com/docs
- **Neon Docs**: https://neon.tech/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **GCS Docs**: https://cloud.google.com/storage/docs

## Rollback Procedure

If deployment fails:

1. In Vercel, go to "Deployments"
2. Find last working deployment
3. Click "..." > "Promote to Production"
4. If database migration issue, restore from backup

---

**Deployment checklist complete. Your T-REX CRM is now live!**
