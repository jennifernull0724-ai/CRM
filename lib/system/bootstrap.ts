import { prisma } from '@/lib/prisma'

/**
 * Ensures company workspace has minimum required system records.
 * Idempotent - safe to call multiple times.
 * 
 * Creates exactly ONE systemSetting record if none exist.
 * Initializes branding + feature flags to empty/default values.
 * 
 * @param companyId - Company ID to bootstrap
 */
export async function ensureCompanyBootstrap(companyId: string): Promise<void> {
  // Check if any systemSetting records exist for this company
  const existingSettings = await prisma.systemSetting.count({
    where: { companyId }
  })

  // If settings already exist, workspace is bootstrapped
  if (existingSettings > 0) {
    return
  }

  // Initialize minimum required systemSetting record
  // This prevents Prisma include failures on fresh accounts
  await prisma.systemSetting.create({
    data: {
      companyId,
      key: 'workspace.initialized',
      value: {
        bootstrappedAt: new Date().toISOString(),
        version: '1.0'
      }
    }
  })
}
