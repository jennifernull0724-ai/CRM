import { prisma } from '@/lib/prisma'
import { getDownloadUrl } from '@/lib/s3'
import type { EmailProvider, EmailTemplateScope } from '@prisma/client'

const BRANDING_UI_LOGO_KEY = 'branding_ui_logo'
const BRANDING_PDF_LOGO_KEY = 'branding_pdf_logo'

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
  lastUpdatedAt: Date | null
  lastUpdatedByName: string | null
}

export type StandardSettingsData = {
  email: StandardEmailSettings
  branding: StandardBrandingInfo
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
        key: { in: [BRANDING_UI_LOGO_KEY, BRANDING_PDF_LOGO_KEY] },
      },
      include: {
        updatedBy: { select: { name: true } },
      },
    }),
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
  let pdfLogoUrl: string | null = null
  let pdfLogoFileName: string | null = null

  if (pdfLogoSetting && typeof pdfLogoSetting === 'object' && 'key' in pdfLogoSetting && pdfLogoSetting.key) {
    pdfLogoUrl = await getDownloadUrl(pdfLogoSetting.key, 600)
    pdfLogoFileName = pdfLogoSetting.fileName ?? null
  }

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
      uiLogoUrl: (brandingMap[BRANDING_UI_LOGO_KEY]?.value as string | null) ?? null,
      pdfLogoUrl,
      pdfLogoFileName,
      lastUpdatedAt: brandingMap[BRANDING_UI_LOGO_KEY]?.updatedAt ?? brandingMap[BRANDING_PDF_LOGO_KEY]?.updatedAt ?? null,
      lastUpdatedByName:
        brandingMap[BRANDING_UI_LOGO_KEY]?.updatedByName ?? brandingMap[BRANDING_PDF_LOGO_KEY]?.updatedByName ?? null,
    },
  }
}
