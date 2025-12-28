import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Top Navigation */}
      <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-12">
              <Link href="/" className="text-2xl font-bold text-white">
                T-REX AI OS
              </Link>
              <div className="hidden md:flex items-center gap-6">
                <Link href="/pricing" className="text-gray-400 hover:text-white text-sm">
                  Pricing
                </Link>
                <Link href="/security" className="text-gray-400 hover:text-white text-sm">
                  Security
                </Link>
                <a href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'jennnull4@gmail.com'}`} className="text-gray-400 hover:text-white text-sm">
                  Contact Support
                </a>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-gray-400 hover:text-white text-sm font-medium">
                Login
              </Link>
              <Link
                href="/request-demo"
                className="bg-orange-600 text-white px-5 py-2 rounded-lg hover:bg-orange-700 font-medium text-sm"
              >
                Request Demo
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              The Operating System for Regulated Field Operations.
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 mb-12 leading-relaxed">
              CRM, estimating, and compliance — built for construction, rail, and environmental teams that cannot afford mistakes.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Link
                href="/request-demo"
                className="w-full sm:w-auto bg-orange-600 text-white px-8 py-4 rounded-lg hover:bg-orange-700 font-semibold text-lg"
              >
                Request Demo
              </Link>
              <Link
                href="/pricing"
                className="w-full sm:w-auto bg-gray-800 text-white px-8 py-4 rounded-lg hover:bg-gray-700 font-semibold text-lg border border-gray-700"
              >
                View Pricing
              </Link>
            </div>
            
            <p className="text-sm text-gray-500">
              <Link href="/login" className="hover:text-gray-400">
                Login to existing account
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <section className="border-y border-gray-800 bg-gray-900/30 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
            <div>
              <div className="text-gray-400 text-sm">Production data model</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Real workflows only</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Explicit enforcement</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Zero data loss</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Every action logged</div>
            </div>
          </div>
        </div>
      </section>

      {/* Built for Regulated Operations */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Built for teams where errors cost time, money, and credibility.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-900 p-8 rounded-lg border border-gray-800">
              <div className="text-4xl mb-4">🏗</div>
              <h3 className="text-2xl font-bold text-white mb-4">Construction</h3>
              <ul className="space-y-3 text-gray-400">
                <li>Pipeline tied to execution</li>
                <li>Estimating approvals with audit logs</li>
                <li>Crew & certification visibility</li>
                <li className="text-gray-500 italic">Purpose-built. No customization required.</li>
              </ul>
            </div>

            <div className="bg-gray-900 p-8 rounded-lg border border-gray-800">
              <div className="text-4xl mb-4">🚆</div>
              <h3 className="text-2xl font-bold text-white mb-4">Railroad</h3>
              <ul className="space-y-3 text-gray-400">
                <li>Subdivision + milepost context on every record</li>
                <li>QR verification for inspectors</li>
                <li>Deterministic compliance snapshots</li>
                <li className="text-gray-500 italic">Purpose-built. No customization required.</li>
              </ul>
            </div>

            <div className="bg-gray-900 p-8 rounded-lg border border-gray-800">
              <div className="text-4xl mb-4">🌎</div>
              <h3 className="text-2xl font-bold text-white mb-4">Environmental</h3>
              <ul className="space-y-3 text-gray-400">
                <li>Permit-driven workflows</li>
                <li>Equipment + monitoring roles baked in</li>
                <li>Regulators see one cohesive record</li>
                <li className="text-gray-500 italic">Purpose-built. No customization required.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Why Not Generic CRM */}
      <section className="py-20 bg-gray-900/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Why T-REX is not a generic CRM
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <span className="text-orange-500 mt-1">✓</span>
              <div className="text-gray-300">Production data model</div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-orange-500 mt-1">✓</span>
              <div className="text-gray-300">Real workflows enforced</div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-orange-500 mt-1">✓</span>
              <div className="text-gray-300">Explicit controls</div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-orange-500 mt-1">✓</span>
              <div className="text-gray-300">Clear feature boundaries</div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-orange-500 mt-1">✓</span>
              <div className="text-gray-300">Structured estimating</div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-orange-500 mt-1">✓</span>
              <div className="text-gray-300">Operational compliance</div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-orange-500 mt-1">✓</span>
              <div className="text-gray-300">Zero data loss on upgrade</div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-orange-500 mt-1">✓</span>
              <div className="text-gray-300">Role clarity enforced</div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Capabilities */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link href="/system/crm" className="bg-gray-900 p-8 rounded-lg border border-gray-800 hover:border-orange-600 transition-colors">
              <h3 className="text-xl font-bold text-white mb-3">CRM Core</h3>
              <p className="text-gray-400 text-sm">
                Contacts, companies, deals, tasks, notes, email — anchored to real humans.
              </p>
            </Link>

            <Link href="/system/estimating" className="bg-gray-900 p-8 rounded-lg border border-gray-800 hover:border-orange-600 transition-colors">
              <h3 className="text-xl font-bold text-white mb-3">Estimating</h3>
              <p className="text-gray-400 text-sm">
                Queue-based estimating with approvals, versioning, and immutable PDFs.
              </p>
            </Link>

            <Link href="/system/compliance" className="bg-gray-900 p-8 rounded-lg border border-gray-800 hover:border-orange-600 transition-colors">
              <h3 className="text-xl font-bold text-white mb-3">Compliance</h3>
              <p className="text-gray-400 text-sm">
                Employees, certifications, documents, QR verification, audit logs.
              </p>
            </Link>

            <Link href="/system/governance" className="bg-gray-900 p-8 rounded-lg border border-gray-800 hover:border-orange-600 transition-colors">
              <h3 className="text-xl font-bold text-white mb-3">Governance</h3>
              <p className="text-gray-400 text-sm">
                Retention, history, and controls for organizations that cannot slip.
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20 bg-gray-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Plan tiers aligned to enforcement.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-center">
              <h3 className="text-xl font-bold text-white mb-2">Starter</h3>
              <p className="text-gray-400 text-sm">14-day controlled access</p>
            </div>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-center">
              <h3 className="text-xl font-bold text-white mb-2">Growth</h3>
              <p className="text-gray-400 text-sm">Operational CRM</p>
            </div>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-center">
              <h3 className="text-xl font-bold text-white mb-2">Pro</h3>
              <p className="text-gray-400 text-sm">Compliance-ready</p>
            </div>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-center">
              <h3 className="text-xl font-bold text-white mb-2">Enterprise</h3>
              <p className="text-gray-400 text-sm">Governance-grade</p>
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/pricing"
              className="inline-block bg-orange-600 text-white px-8 py-3 rounded-lg hover:bg-orange-700 font-medium"
            >
              View Full Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Request Demo Section */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Request a live walkthrough of the real system.
            </h2>
            <div className="text-gray-400 space-y-2">
              <p>You will see:</p>
              <ul className="text-sm space-y-1">
                <li>Production data model (no sandbox)</li>
                <li>Estimating, compliance, and governance in one pass</li>
                <li>Security and retention controls in context</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-900 p-8 rounded-lg border border-gray-800">
            <form action="/api/request-demo" method="POST" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    className="w-full px-4 py-3 bg-gray-950 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-300 mb-2">
                    Company *
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    required
                    className="w-full px-4 py-3 bg-gray-950 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="w-full px-4 py-3 bg-gray-950 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label htmlFor="industry" className="block text-sm font-medium text-gray-300 mb-2">
                  Industry *
                </label>
                <select
                  id="industry"
                  name="industry"
                  required
                  className="w-full px-4 py-3 bg-gray-950 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select industry</option>
                  <option value="construction">Construction</option>
                  <option value="railroad">Railroad</option>
                  <option value="environmental">Environmental</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                  Message (optional)
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-950 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full bg-orange-600 text-white px-6 py-4 rounded-lg hover:bg-orange-700 font-semibold text-lg"
              >
                Request Demo
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Security Callout */}
      <section className="py-12 border-t border-gray-800 bg-gray-900/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-sm text-gray-400">
            <div>Role-based access enforced server-side</div>
            <div>Immutable audit logs</div>
            <div>Versioned documents</div>
            <div>Retention controls by design</div>
          </div>
          <div className="text-center mt-6">
            <Link href="/security" className="text-orange-500 hover:text-orange-400 text-sm">
              Learn more about security →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="text-2xl font-bold text-white mb-2">T-REX AI OS</div>
              <p className="text-gray-500 text-sm">
                Command system for regulated field operations.
              </p>
            </div>
            <div className="flex flex-col md:items-end gap-3">
              <Link href="/pricing" className="text-gray-400 hover:text-white text-sm">
                Pricing
              </Link>
              <a href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'jennnull4@gmail.com'}`} className="text-gray-400 hover:text-white text-sm">
                Contact Support
              </a>
              <Link href="/legal/terms" className="text-gray-400 hover:text-white text-sm">
                Terms
              </Link>
              <Link href="/legal/privacy" className="text-gray-400 hover:text-white text-sm">
                Privacy
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} T-REX AI OS. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
