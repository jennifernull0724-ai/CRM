const sections = [
  {
    title: 'Terms of Service',
    body: [
      'T-REX AI OS is operated by Placeholder Holdings, Inc. Use of the platform is governed by executed agreements or these default terms.',
      'Starter workspaces have read-only expirations; paid subscriptions are annual and billed through Stripe. Unauthorized use, demo sandboxes, or fake accounts are not permitted.',
      'All estimating, compliance, and governance data is stored in US regions unless otherwise contracted. Export controls apply to every account.',
    ],
  },
  {
    title: 'Privacy Policy',
    body: [
      'Customer data is only processed to deliver CRM, estimating, compliance, and governance workflows. We do not sell data or run ads.',
      'Email, file storage, and QR verification rely on third-party processors (Resend, AWS S3, Stripe, and others documented in the DPIA).',
      'Right-to-be-forgotten requests must go through the owner role for each workspace to ensure regulatory traceability.',
    ],
  },
  {
    title: 'Jurisdiction',
    body: [
      'Primary legal venue: State of Delaware, USA. Alternate venues require negotiated enterprise agreements.',
      'All disputes require arbitration before any court filings. Emergency injunctive relief may be sought to protect IP.',
    ],
  },
]

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-12 space-y-8">
        <header>
          <p className="text-sm uppercase tracking-wide text-slate-500">Legal</p>
          <h1 className="text-4xl font-bold text-slate-900">Terms & privacy</h1>
          <p className="text-slate-600 mt-2">
            Production system. No demo warranties. Update this page when counsel finalizes contract language for T-REX AI OS.
          </p>
        </header>

        {sections.map((section) => (
          <section key={section.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">{section.title}</h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
