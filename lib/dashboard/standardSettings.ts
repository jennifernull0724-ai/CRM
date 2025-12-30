import { prisma } from '@/lib/prisma'
import { getDownloadUrl } from '@/lib/s3'
import type { EmailProvider, EmailTemplateScope } from '@prisma/client'

const BRANDING_UI_LOGO_KEY = 'branding_ui_logo'
const BRANDING_PDF_LOGO_KEY = 'branding_pdf_logo'
const BRANDING_DISPATCH_PDF_LOGO_KEY = 'branding_dispatch_pdf_logo'

export type StandardEmailIntegration = {
  id: string
  provider: EmailProvider
  status: string
  isActive: boolean
  connectedAt: Date | null
  disconnectedAt: Date | null
}

export type StandardEmailTemplate = {
  id: string
  name: string
  subject: string
  body: string
  scope: EmailTemplateScope
  isDefault: boolean
  updatedAt: Date
  createdByName: string | null
  updatedByName: string | null
}

export type StandardEmailSignature = {
  id: string
  name: string
  content: string
  isActive: boolean
  createdAt: Date
  createdByName: string | null
}

export type StandardEmailPreference = {
  id: string
  email: string
  sendEnabled: boolean
  reason: string | null
  updatedAt: Date
}

export type StandardEmailSettings = {
  integrations: StandardEmailIntegration[]
  templates: StandardEmailTemplate[]
  signatures: StandardEmailSignature[]
  recipientPreferences: StandardEmailPreference[]
  activeSignatureId: string | null
}

export type StandardBrandingInfo = {
  uiLogoUrl: string | null
  pdfLogoUrl: string | null
  pdfLogoFileName: string | null
  dispatchPdfLogoUrl: string | null
  dispatchPdfLogoFileName: string | null
  lastUpdatedAt: Date | null
  lastUpdatedByName: string | null
}

export type StandardSettingsData = {
  email: StandardEmailSettings
  branding: StandardBrandingInfo
}

export type StandardSettingsSnapshot = {
  email: {
    gmail: {
      connected: boolean
      active: boolean
    }
    outlook: {
      connected: boolean
      active: boolean
    }
    templates: Array<{
      id: string
      name: string
      scope: EmailTemplateScope
      updatedAt: string
      isDefault: boolean
    }>
    templateLimit: number
    signatures: Array<{
      id: string
      name: string
      isActive: boolean
    }>
    activeSignatureName: string | null
    recipientExclusionCount: number
  }
  branding: {
    uiLogoUrl: string | null
    pdfLogoUrl: string | null
    dispatchPdfLogoUrl: string | null
    lastUpdatedAt: string | null
    lastUpdatedByName: string | null
  }
}

type BrandingAssetValue = {
  key: string
  fileName?: string
  contentType?: string
  size?: number
}

export async function loadStandardSettings(companyId: string): Promise<StandardSettingsData> {
  const [integrations, templatesRaw, signaturesRaw, recipientPreferences, brandingSettings] = await Promise.all([
    prisma.emailIntegration.findMany({
      where: { companyId },
      orderBy: { provider: 'asc' },
    }),
    prisma.emailTemplate.findMany({
      where: { companyId },
      orderBy: [{ scope: 'asc' }, { name: 'asc' }],
      include: {
        createdBy: { select: { name: true } },
        updatedBy: { select: { name: true } },
      },
    }),
    prisma.emailSignature.findMany({
      where: { companyId },
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
      include: {
        createdBy: { select: { name: true } },
      },
    }),
    prisma.emailRecipientPreference.findMany({
      where: { companyId },
      orderBy: [{ sendEnabled: 'desc' }, { email: 'asc' }],
    }),
    prisma.systemSetting.findMany({
      where: {
        companyId,
        key: { in: [BRANDING_UI_LOGO_KEY, BRANDING_PDF_LOGO_KEY, BRANDING_DISPATCH_PDF_LOGO_KEY] },
      },
      include: {
        updatedBy: {
          select: { name: true }
        },
      },
    }).catch(() => []), // ✅ Return empty array if query fails on fresh account
  ])

  const brandingMap = brandingSettings.reduce<
    Record<string, { value: BrandingAssetValue | string | null; updatedAt: Date | null; updatedByName: string | null }>
  >((acc, setting) => {
    acc[setting.key] = {
      value: (setting.value as BrandingAssetValue) ?? null,
      updatedAt: setting.updatedAt,
      updatedByName: setting.updatedBy?.name ?? null,
    }
    return acc
  }, {})

  const pdfLogoSetting = brandingMap[BRANDING_PDF_LOGO_KEY]?.value as BrandingAssetValue | string | null
  const uiLogoSetting = brandingMap[BRANDING_UI_LOGO_KEY]?.value as BrandingAssetValue | string | null
  let pdfLogoUrl: string | null = null
  let pdfLogoFileName: string | null = null
  let uiLogoUrl: string | null = null
  let dispatchPdfLogoUrl: string | null = null
  let dispatchPdfLogoFileName: string | null = null

  if (uiLogoSetting && typeof uiLogoSetting === 'object' && 'key' in uiLogoSetting && uiLogoSetting.key) {
    uiLogoUrl = await getDownloadUrl(uiLogoSetting.key, 600)
  }

  if (pdfLogoSetting && typeof pdfLogoSetting === 'object' && 'key' in pdfLogoSetting && pdfLogoSetting.key) {
    pdfLogoUrl = await getDownloadUrl(pdfLogoSetting.key, 600)
    pdfLogoFileName = pdfLogoSetting.fileName ?? null
  }

  const dispatchLogoSetting = brandingMap[BRANDING_DISPATCH_PDF_LOGO_KEY]?.value as BrandingAssetValue | string | null
  if (dispatchLogoSetting && typeof dispatchLogoSetting === 'object' && 'key' in dispatchLogoSetting && dispatchLogoSetting.key) {
    dispatchPdfLogoUrl = await getDownloadUrl(dispatchLogoSetting.key, 600)
    dispatchPdfLogoFileName = dispatchLogoSetting.fileName ?? null
  }

  const brandingTimestamps = [
    brandingMap[BRANDING_UI_LOGO_KEY]?.updatedAt ?? null,
    brandingMap[BRANDING_PDF_LOGO_KEY]?.updatedAt ?? null,
    brandingMap[BRANDING_DISPATCH_PDF_LOGO_KEY]?.updatedAt ?? null,
  ].filter((value): value is Date => Boolean(value))

  const lastUpdatedAt = brandingTimestamps.sort((a, b) => b.getTime() - a.getTime())[0] ?? null
  const lastUpdatedByName = lastUpdatedAt
    ? ([BRANDING_UI_LOGO_KEY, BRANDING_PDF_LOGO_KEY, BRANDING_DISPATCH_PDF_LOGO_KEY]
        .map((key) => brandingMap[key])
        .find((entry) => entry?.updatedAt?.getTime() === lastUpdatedAt.getTime())?.updatedByName ?? null)
    : null

  const activeSignature = signaturesRaw.find((signature) => signature.isActive) ?? null

  return {
    email: {
      integrations: integrations.map((integration) => ({
        id: integration.id,
        provider: integration.provider,
        status: integration.status,
        isActive: integration.isActive,
        connectedAt: integration.connectedAt,
        disconnectedAt: integration.disconnectedAt,
      })),
      templates: templatesRaw.map((template) => ({
        id: template.id,
        name: template.name,
        subject: template.subject,
        body: template.body,
        scope: template.scope,
        isDefault: template.isDefault,
        updatedAt: template.updatedAt,
        createdByName: template.createdBy?.name ?? null,
        updatedByName: template.updatedBy?.name ?? null,
      })),
      signatures: signaturesRaw.map((signature) => ({
        id: signature.id,
        name: signature.name,
        content: signature.content,
        isActive: signature.isActive,
        createdAt: signature.createdAt,
        createdByName: signature.createdBy?.name ?? null,
      })),
      recipientPreferences: recipientPreferences.map((preference) => ({
        id: preference.id,
        email: preference.email,
        sendEnabled: preference.sendEnabled,
        reason: preference.reason,
        updatedAt: preference.updatedAt,
      })),
      activeSignatureId: activeSignature?.id ?? null,
    },
    branding: {
      uiLogoUrl,
      pdfLogoUrl,
      pdfLogoFileName,
      dispatchPdfLogoUrl,
      dispatchPdfLogoFileName,
      lastUpdatedAt,
      lastUpdatedByName,
    },
  }
}

export function mapStandardSettingsToSnapshot(
  data: StandardSettingsData,
  templateLimit = 5,
): StandardSettingsSnapshot {
  const gmailIntegration = data.email.integrations.find((integration) => integration.provider === 'gmail')
  const outlookIntegration = data.email.integrations.find((integration) => integration.provider === 'outlook')
  const templateSlice = data.email.templates.slice(0, templateLimit)
  const signatures = data.email.signatures.map((signature) => ({
    id: signature.id,
    name: signature.name,
    isActive: signature.isActive,
  }))
  const activeSignatureName = data.email.signatures.find((signature) => signature.isActive)?.name ?? null
  const recipientExclusionCount = data.email.recipientPreferences.filter((preference) => !preference.sendEnabled).length

  return {
    email: {
      gmail: {
        connected: gmailIntegration?.status === 'connected',
        active: Boolean(gmailIntegration?.isActive),
      },
      outlook: {
        connected: outlookIntegration?.status === 'connected',
        active: Boolean(outlookIntegration?.isActive),
      },
      templates: templateSlice.map((template) => ({
        id: template.id,
        name: template.name,
        scope: template.scope,
        updatedAt: template.updatedAt.toISOString(),
        isDefault: template.isDefault,
      })),
      templateLimit,
      signatures,
      activeSignatureName,
      recipientExclusionCount,
    },
    branding: {
      uiLogoUrl: data.branding.uiLogoUrl,
      pdfLogoUrl: data.branding.pdfLogoUrl,
      dispatchPdfLogoUrl: data.branding.dispatchPdfLogoUrl,
      lastUpdatedAt: data.branding.lastUpdatedAt?.toISOString() ?? null,
      lastUpdatedByName: data.branding.lastUpdatedByName,
    },
  }
}
