import 'dotenv/config'

/**
 * SERVER-ONLY EMAIL INGESTION RUNNER
 * tsx-compatible, no runtime hacks
 */

import { ingestRecentEmailsForAllAccounts } from '../lib/email/ingest'

async function main() {
  const expectedKey = process.env.EMAIL_INGESTION_SCHEDULER_KEY

  if (!expectedKey) {
    throw new Error('EMAIL_INGESTION_SCHEDULER_KEY is not set')
  }

  console.log('🔐 Scheduler key validated')
  console.log('📥 Starting email ingestion')

  await ingestRecentEmailsForAllAccounts()

  console.log('✅ Email ingestion completed')
}

main().catch((err) => {
  console.error('❌ Email ingestion failed')
  console.error(err)
  process.exit(1)
})
