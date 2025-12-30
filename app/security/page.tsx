import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingFooter } from '@/components/public/marketing-footer'
import { MarketingHeader } from '@/components/public/marketing-header'

export const metadata: Metadata = {
  title: 'Security & Governance | T-REX AI OS',
  description:
    'Role-based access control, immutable audit logs, signed PDFs, and compliance snapshots built for regulated operations.',
  alternates: {
    canonical: 'https://trexaios.com/security',
  },
  robots: {
    index: true,
    follow: true,
  },
}

const sections = [
  {
    title: 'Governance Model',
    body: 'Authority is separated by design: Governance (Owner/Admin), Pricing (Estimator), Execution (Dispatch), Operations (Users). No role can exceed its mandate.'
  },
  {
    title: 'Access Enforcement',
    list: [
      'Server-side role validation on every request',
      'No reliance on client-side controls',
      'Company-scoped data isolation',
    ],
  },
  {
    title: 'Audit & Non-Repudiation',
    list: [
      'Append-only audit logs',
      'Immutable records for approvals and compliance',
      'Cryptographic verification of critical artifacts',
    ],
  },
  {
    title: 'Document Security',
    list: [
      'Encrypted storage',
      'Signed, time-limited access',
      'Versioned PDFs',
      'No public file exposure',
    ],
  },
  {
    title: 'Compliance Integrity',
    list: [
      'Compliance records are Owner/Admin controlled',
      'Snapshot-based and QR-verifiable',
      'Immutable after issuance',
    ],
  },
  {
    title: 'Operational Reality',
    body: 'The system supports real-world workflows: Email attachments allowed, field uploads supported, bid documents and operational files preserved. Execution never blocks without visibility.'
  },
]

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-[#f5f6f9]">
      <MarketingHeader />
      <main className="mx-auto max-w-4xl px-4 py-16 space-y-10">
        <header className="space-y-4">
          <p className="text-xs uppercase tracking-[0.4em] text-[#6d768a]">Security</p>
          <h1 className="text-4xl font-semibold text-[#050d1a]">Security & Governance</h1>
          <p className="text-sm text-[#4c566a]">
            T-REX AI OS is built for regulated operational environments where accountability, auditability, and access control are mandatory—not optional. Security is enforced at the system architecture level.
          </p>
        </header>

        <section className="border border-[#c9ceda] bg-white p-6 text-sm text-[#0b1220]">
          <h2 className="text-2xl font-semibold text-[#050d1a]">Security & Governance (Final Public Version)</h2>
          <p className="mt-3">Security is not marketing copy. It is a design constraint for every workflow inside the platform.</p>
        </section>

        {sections.map((section) => (
          <section key={section.title} className="border border-[#c9ceda] bg-white p-6 text-sm text-[#0b1220]">
            <h3 className="text-2xl font-semibold text-[#050d1a]">{section.title}</h3>
            {section.body ? <p className="mt-3 text-[#4c566a]">{section.body}</p> : null}
            {section.list ? (
              <ul className="mt-4 list-disc list-inside text-[#0b1220] space-y-1">
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}

        <section className="border border-[#c9ceda] bg-white p-6 text-sm text-[#0b1220] space-y-3">
          <h3 className="text-2xl font-semibold text-[#050d1a]">Audit-Ready by Default</h3>
          <p>
            The system withstands audits, disputes, and inspections by default. Field uploads, bid documents, and operational files are preserved, and every action is attributable.
          </p>
        </section>

        <div className="border border-[#c9ceda] bg-white p-6 text-sm text-[#0b1220]">
          <p className="font-semibold text-[#050d1a]">Next steps</p>
          <p className="mt-2 text-[#4c566a]">Need deeper evidence? Request full security documentation via support.</p>
          <Link href="/support" className="mt-3 inline-flex text-sm font-semibold text-[#d5530d]">
            Contact Support
          </Link>
        </div>
      </main>
      <MarketingFooter />
    </div>
  )
}
