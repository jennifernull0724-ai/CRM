import type { Metadata } from 'next'
import { MarketingFooter } from '@/components/public/marketing-footer'
import { MarketingHeader } from '@/components/public/marketing-header'

export const metadata: Metadata = {
  title: 'Privacy Policy | T-REX AI OS',
  description:
    'How T-REX AI OS collects, stores, and protects data across CRM, estimating, dispatch, and compliance systems.',
  alternates: {
    canonical: 'https://trexaios.com/privacy',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f5f6f9] text-[#0b1220]">
      <MarketingHeader />
      <main className="mx-auto max-w-4xl px-4 py-16 space-y-10">
        <header className="space-y-4">
          <p className="text-xs uppercase tracking-[0.4em] text-[#6d768a]">Legal</p>
          <h1 className="text-4xl font-semibold text-[#050d1a]">Privacy Policy</h1>
          <p className="text-sm text-[#4c566a]">Effective Date: December 30, 2025</p>
          <p className="text-sm text-[#4c566a]">
            T-REX AI OS (&quot;T-REX,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) respects the privacy of its users and is committed to protecting personal and organizational data entrusted to the platform. This Privacy Policy explains how information is collected, used, stored, and protected when you access or use the T-REX AI OS platform.
          </p>
        </header>

        <section className="space-y-6 border border-[#c9ceda] bg-white p-6">
          <h2 className="text-2xl font-semibold text-[#050d1a]">1. Information We Collect</h2>
          <p className="text-sm text-[#4c566a]">We collect only the information necessary to operate a secure, auditable, and compliant operational system.</p>
          <div className="space-y-4 text-sm text-[#0b1220]">
            <div>
              <h3 className="font-semibold text-[#050d1a]">1.1 Account & Identity Information</h3>
              <ul className="list-disc list-inside text-[#4c566a]">
                <li>Name</li>
                <li>Email address</li>
                <li>Role and company affiliation</li>
                <li>Authentication credentials (managed via secure identity providers)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-[#050d1a]">1.2 Operational Data</h3>
              <ul className="list-disc list-inside text-[#4c566a]">
                <li>Contacts, deals, estimates, work orders, and tasks entered by users</li>
                <li>Uploaded documents (e.g., bid documents, PDFs, compliance records)</li>
                <li>System-generated artifacts such as PDFs and audit logs</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-[#050d1a]">1.3 Technical & Usage Data</h3>
              <ul className="list-disc list-inside text-[#4c566a]">
                <li>IP address</li>
                <li>Browser and device metadata</li>
                <li>Session identifiers</li>
                <li>Audit and access logs</li>
              </ul>
              <p className="mt-2 text-sm text-[#4c566a]">T-REX does not collect consumer behavioral tracking data, sell personal data, or perform advertising profiling.</p>
            </div>
          </div>
        </section>

        <section className="space-y-4 border border-[#c9ceda] bg-white p-6 text-sm text-[#0b1220]">
          <h2 className="text-2xl font-semibold text-[#050d1a]">2. How We Use Information</h2>
          <p>Information is used solely to:</p>
          <ul className="list-disc list-inside text-[#4c566a] space-y-1">
            <li>Provide and operate the T-REX AI OS platform</li>
            <li>Authenticate users and enforce role-based access</li>
            <li>Generate estimates, work orders, and compliance artifacts</li>
            <li>Maintain immutable audit and activity records</li>
            <li>Deliver system emails and notifications</li>
            <li>Comply with legal and regulatory obligations</li>
          </ul>
          <p className="text-[#4c566a]">We do not use customer data to train public AI models or for unrelated commercial purposes.</p>
        </section>

        <section className="space-y-4 border border-[#c9ceda] bg-white p-6 text-sm text-[#0b1220]">
          <h2 className="text-2xl font-semibold text-[#050d1a]">3. Data Storage & Security</h2>
          <p>All data is stored using industry-standard security controls, including:</p>
          <ul className="list-disc list-inside text-[#4c566a] space-y-1">
            <li>Encrypted storage for documents and records</li>
            <li>Server-side access enforcement</li>
            <li>Company-level data isolation</li>
            <li>Time-limited, signed URLs for file access</li>
            <li>Immutable storage for audit-critical artifacts</li>
            <li>No files exposed through public or guessable URLs</li>
          </ul>
        </section>

        <section className="space-y-4 border border-[#c9ceda] bg-white p-6 text-sm text-[#0b1220]">
          <h2 className="text-2xl font-semibold text-[#050d1a]">4. Data Retention</h2>
          <ul className="list-disc list-inside text-[#4c566a] space-y-1">
            <li>Audit logs are retained indefinitely for accountability</li>
            <li>Approved estimates and work orders are retained as immutable records</li>
            <li>Archived records preserve full historical context</li>
            <li>Deleted users retain attribution in historical logs</li>
          </ul>
          <p className="text-[#4c566a]">Retention policies are designed to support regulatory, contractual, and audit requirements.</p>
        </section>

        <section className="space-y-4 border border-[#c9ceda] bg-white p-6 text-sm text-[#0b1220]">
          <h2 className="text-2xl font-semibold text-[#050d1a]">5. Data Sharing</h2>
          <p>T-REX does not sell or rent customer data. Data may be shared only:</p>
          <ul className="list-disc list-inside text-[#4c566a] space-y-1">
            <li>With authorized users inside the same company</li>
            <li>With service providers strictly necessary to operate the platform (e.g., email delivery, storage)</li>
            <li>When required by law or legal process</li>
          </ul>
        </section>

        <section className="space-y-4 border border-[#c9ceda] bg-white p-6 text-sm text-[#0b1220]">
          <h2 className="text-2xl font-semibold text-[#050d1a]">6. User Rights</h2>
          <p>Depending on jurisdiction, users may have rights to:</p>
          <ul className="list-disc list-inside text-[#4c566a] space-y-1">
            <li>Access their personal information</li>
            <li>Request corrections</li>
            <li>Request deletion where legally permissible</li>
          </ul>
          <p className="text-[#4c566a]">Requests may be limited where data must be retained for compliance or audit integrity.</p>
        </section>

        <section className="space-y-3 border border-[#c9ceda] bg-white p-6 text-sm text-[#0b1220]">
          <h2 className="text-2xl font-semibold text-[#050d1a]">7. Changes to This Policy</h2>
          <p>This Privacy Policy may be updated periodically. Material changes will be communicated through the platform.</p>
        </section>

        <section className="space-y-3 border border-[#c9ceda] bg-white p-6 text-sm text-[#0b1220]">
          <h2 className="text-2xl font-semibold text-[#050d1a]">8. Contact</h2>
          <p>For privacy inquiries, contact privacy@trexaios.com (or your designated legal contact).</p>
        </section>
      </main>
      <MarketingFooter />
    </div>
  )
}
