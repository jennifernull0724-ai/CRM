import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service | T-REX AI OS',
  description:
    'Terms governing the use of T-REX AI OS for operational CRM, estimating, dispatch, and compliance workflows.',
  alternates: {
    canonical: 'https://trexaios.com/terms',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-16 space-y-10">
        <header className="space-y-4">
          <p className="text-xs uppercase tracking-[0.4em] text-orange-400">Legal</p>
          <h1 className="text-4xl font-bold">Terms of Service</h1>
          <p className="text-gray-400">Effective Date: December 30, 2025</p>
          <p className="text-gray-400">
            These Terms of Service (&quot;Terms&quot;) govern access to and use of the T-REX AI OS platform. By accessing or using the
            platform, you agree to be bound by these Terms.
          </p>
        </header>

        <div className="space-y-6 text-sm text-gray-300">
          <section className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
            <h2 className="text-2xl font-semibold text-white">1. Platform Purpose</h2>
            <p>T-REX AI OS is an operational system for CRM, estimating, dispatch, and compliance management. It is designed for professional, commercial use only. The platform is not a consumer service.</p>
          </section>

          <section className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
            <h2 className="text-2xl font-semibold text-white">2. Accounts & Roles</h2>
            <p>
              Access to the platform is role-based. Users may only perform actions permitted by their assigned role. Circumventing access controls, misusing permissions, or attempting to access restricted modules constitutes a violation of these Terms.
            </p>
          </section>

          <section className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
            <h2 className="text-2xl font-semibold text-white">3. Customer Responsibilities</h2>
            <p>You are responsible for:</p>
            <ul className="mt-3 list-disc list-inside text-gray-400 space-y-1">
              <li>Maintaining accurate account information</li>
              <li>Assigning appropriate roles</li>
              <li>Ensuring users act within their authority</li>
              <li>Safeguarding login credentials</li>
            </ul>
            <p className="mt-3">You are solely responsible for the content and documents uploaded to the platform.</p>
          </section>

          <section className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
            <h2 className="text-2xl font-semibold text-white">4. Data Integrity & Auditability</h2>
            <p>
              Certain records—including audit logs, approved estimates, work orders, and compliance snapshots—are immutable by design. You acknowledge and agree that approved records cannot be altered or deleted, historical data is preserved for accountability, and system logs are authoritative.
            </p>
          </section>

          <section className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
            <h2 className="text-2xl font-semibold text-white">5. Email & Communications</h2>
            <p>The platform enables outbound email using authorized accounts. You are responsible for recipient selection, content accuracy, and compliance with applicable communication laws. All outbound messages are logged for audit purposes.</p>
          </section>

          <section className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
            <h2 className="text-2xl font-semibold text-white">6. Subscription & Billing</h2>
            <p>
              Subscription tiers, pricing, and seat limits are enforced server-side. Trial access is time-limited and may become read-only. Upgrades do not result in data loss, and features are restricted by subscription tier. Failure to maintain an active subscription may limit access but will not delete historical data.
            </p>
          </section>

          <section className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
            <h2 className="text-2xl font-semibold text-white">7. Acceptable Use</h2>
            <p>You may not upload unlawful or malicious content, attempt to bypass system security, interfere with platform integrity, or reverse engineer or misuse the platform. Violations may result in suspension or termination.</p>
          </section>

          <section className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
            <h2 className="text-2xl font-semibold text-white">8. Intellectual Property</h2>
            <p>T-REX AI OS and all associated software, trademarks, and documentation are the property of T-REX. Customers retain ownership of their data.</p>
          </section>

          <section className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
            <h2 className="text-2xl font-semibold text-white">9. Disclaimers</h2>
            <p>The platform is provided &quot;as is&quot; and &quot;as available.&quot; T-REX does not guarantee uninterrupted availability and disclaims implied warranties to the maximum extent permitted by law.</p>
          </section>

          <section className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
            <h2 className="text-2xl font-semibold text-white">10. Limitation of Liability</h2>
            <p>To the fullest extent permitted by law, T-REX shall not be liable for indirect, incidental, or consequential damages arising from platform use.</p>
          </section>

          <section className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
            <h2 className="text-2xl font-semibold text-white">11. Governing Law</h2>
            <p>These Terms are governed by the laws of the State of Delaware, without regard to conflict-of-law principles.</p>
          </section>

          <section className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
            <h2 className="text-2xl font-semibold text-white">12. Contact</h2>
            <p>For legal inquiries: legal@trexaios.com</p>
          </section>
        </div>
      </div>
    </main>
  )
}
