import React from 'react'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import { getServerSession } from 'next-auth'
import {
  uploadUiLogoAction,
  removeUiLogoAction,
  uploadPdfLogoAction,
  removePdfLogoAction,
  uploadDispatchPdfLogoAction,
  removeDispatchPdfLogoAction,
} from '@/app/dashboard/settings/actions'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const BRANDING_UI_LOGO_KEY = 'branding_ui_logo'
const BRANDING_PDF_LOGO_KEY = 'branding_pdf_logo'
const BRANDING_DISPATCH_PDF_LOGO_KEY = 'branding_dispatch_pdf_logo'

function Guard({ children, role }: { children: React.ReactNode; role: string }) {
  if (!['owner', 'admin'].includes(role)) {
    redirect('/settings')
  }
  return <>{children}</>
}

export default async function BrandingSettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/login?from=/settings/branding')
  }

  const role = session.user.role as string
  const companyId = session.user.companyId
  if (!companyId) {
    redirect('/login?from=/settings/branding')
  }

  const [uiLogoSetting, pdfLogoSetting, dispatchPdfLogoSetting] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { companyId_key: { companyId, key: BRANDING_UI_LOGO_KEY } } }),
    prisma.systemSetting.findUnique({ where: { companyId_key: { companyId, key: BRANDING_PDF_LOGO_KEY } } }),
    prisma.systemSetting.findUnique({ where: { companyId_key: { companyId, key: BRANDING_DISPATCH_PDF_LOGO_KEY } } }),
  ])

  const uiLogo = (uiLogoSetting?.value as { key?: string; fileName?: string } | null) ?? null
  const pdfLogo = (pdfLogoSetting?.value as { key?: string; fileName?: string } | null) ?? null
  const dispatchPdfLogo = (dispatchPdfLogoSetting?.value as { key?: string; fileName?: string } | null) ?? null

  return (
    <Guard role={role}>
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-10 space-y-6">
          <header>
            <p className="text-sm uppercase tracking-wide text-slate-500">Settings</p>
            <h1 className="text-3xl font-bold text-slate-900">Branding</h1>
            <p className="text-slate-600">Owner/Admin controlled branding. Sidebar logo is empty by default until you upload one.</p>
          </header>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-700">UI Logo (Sidebar / Shell)</p>
                <p className="text-sm text-slate-600">Optional. Appears in the top-left shell slot after upload. No default branding.</p>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                {uiLogo?.key ? (
                  <div className="flex items-center gap-2">
                    <div className="relative h-10 w-28 overflow-hidden rounded border border-slate-200 bg-slate-50">
                      <Image src={`/api/files/${encodeURIComponent(uiLogo.key)}`} alt="Current UI logo" fill className="object-contain" />
                    </div>
                    <span className="text-xs text-slate-500">{uiLogo.fileName ?? 'Uploaded logo'}</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">No logo uploaded</span>
                )}
              </div>
            </div>
            <form action={uploadUiLogoAction} className="space-y-3" encType="multipart/form-data">
              <input type="file" name="logo" accept="image/*" className="block text-sm" required />
              <button type="submit" className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm">
                Upload UI logo
              </button>
            </form>
            <form action={removeUiLogoAction} className="space-y-3">
              <button
                type="submit"
                className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                disabled={!uiLogo?.key}
              >
                Remove UI logo
              </button>
            </form>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-700">Estimating PDF Logo</p>
                <p className="text-sm text-slate-600">Used for estimating PDFs only. Does not affect the UI shell.</p>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                {pdfLogo?.key ? (
                  <div className="flex items-center gap-2">
                    <div className="relative h-10 w-28 overflow-hidden rounded border border-slate-200 bg-slate-50">
                      <Image src={`/api/files/${encodeURIComponent(pdfLogo.key)}`} alt="Current PDF logo" fill className="object-contain" />
                    </div>
                    <span className="text-xs text-slate-500">{pdfLogo.fileName ?? 'Uploaded logo'}</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">No logo uploaded</span>
                )}
              </div>
            </div>
            <form action={uploadPdfLogoAction} className="space-y-3" encType="multipart/form-data">
              <input type="file" name="logo" accept="image/*" className="block text-sm" required />
              <button type="submit" className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm">
                Upload PDF logo
              </button>
            </form>
            <form action={removePdfLogoAction} className="space-y-3">
              <button
                type="submit"
                className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                disabled={!pdfLogo?.key}
              >
                Remove PDF logo
              </button>
            </form>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-700">Dispatch PDF Logo</p>
                <p className="text-sm text-slate-600">Used for dispatch + work-order PDF exports. Falls back to the estimating logo until set.</p>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                {dispatchPdfLogo?.key ? (
                  <div className="flex items-center gap-2">
                    <div className="relative h-10 w-28 overflow-hidden rounded border border-slate-200 bg-slate-50">
                      <Image src={`/api/files/${encodeURIComponent(dispatchPdfLogo.key)}`} alt="Current dispatch PDF logo" fill className="object-contain" />
                    </div>
                    <span className="text-xs text-slate-500">{dispatchPdfLogo.fileName ?? 'Uploaded logo'}</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">No logo uploaded</span>
                )}
              </div>
            </div>
            <form action={uploadDispatchPdfLogoAction} className="space-y-3" encType="multipart/form-data">
              <input type="file" name="logo" accept="image/*" className="block text-sm" required />
              <button type="submit" className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm">
                Upload dispatch PDF logo
              </button>
            </form>
            <form action={removeDispatchPdfLogoAction} className="space-y-3">
              <button
                type="submit"
                className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                disabled={!dispatchPdfLogo?.key}
              >
                Remove dispatch logo
              </button>
            </form>
          </section>
        </div>
      </div>
    </Guard>
  )
}
