import Link from 'next/link'
import { 
  Building2, 
  Train, 
  TreePine, 
  Shield, 
  Clock, 
  FileText,
  CheckCircle2,
  ArrowRight
} from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-gray-900">
            Contractor CRM
          </div>
          
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
            <a href="#estimating" className="text-gray-600 hover:text-gray-900">Estimating</a>
            <a href="#compliance" className="text-gray-600 hover:text-gray-900">Compliance</a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</a>
          </nav>

          <div className="flex items-center space-x-4">
            <Link 
              href="/request-demo"
              className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              Request Demo
            </Link>
            <Link 
              href="/login"
              className="px-4 py-2.5 text-gray-700 font-semibold hover:text-gray-900 transition"
            >
              Owner Login
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
              The Contractor Operating System.
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Contacts, estimating, compliance, and activity — unified, auditable, and owner-controlled.
            </p>
            
            <div className="space-y-4 mb-10">
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-gray-700">Contacts are the system anchor</p>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-gray-700">Every action logged, never rewritten</p>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-gray-700">Compliance enforced only when you approve</p>
              </div>
            </div>

            <div className="flex space-x-4">
              <Link 
                href="/request-demo"
                className="px-8 py-3.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition inline-flex items-center"
              >
                Request Demo
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <a 
                href="#how-it-works"
                className="px-8 py-3.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:border-gray-400 transition"
              >
                View How It Works
              </a>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-gray-100 rounded-2xl p-12 border border-gray-200">
            <div className="space-y-6">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-sm font-semibold text-gray-500 mb-2">CONTACT</div>
                <div className="text-lg font-bold text-gray-900">Acme Railroad Services</div>
              </div>
              <div className="flex items-center justify-center">
                <ArrowRight className="w-8 h-8 text-gray-400" />
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-sm font-semibold text-gray-500 mb-2">ACTIVITY</div>
                <div className="text-sm text-gray-700">Call logged · Estimate created · Email sent</div>
              </div>
              <div className="flex items-center justify-center">
                <ArrowRight className="w-8 h-8 text-gray-400" />
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-sm font-semibold text-gray-500 mb-2">ESTIMATE</div>
                <div className="text-lg font-bold text-gray-900">$247,500</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who This Is For */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Built for Contractors Who Need Control
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl border border-gray-200">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <Train className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Railroad Contractors</h3>
              <p className="text-gray-600 mb-4">
                FRA requirements, site safety, and certification tracking create compliance chaos.
              </p>
              <p className="text-gray-900 font-semibold">
                Know your compliance status before the inspector asks.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl border border-gray-200">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Construction Contractors</h3>
              <p className="text-gray-600 mb-4">
                Estimating drives revenue, but follow-up is disconnected from the estimate.
              </p>
              <p className="text-gray-900 font-semibold">
                Connect sales activity directly to your estimating engine.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl border border-gray-200">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <TreePine className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Environmental Firms</h3>
              <p className="text-gray-600 mb-4">
                Certifications, expirations, and credentials are tracked manually or not at all.
              </p>
              <p className="text-gray-900 font-semibold">
                Audit-ready compliance without spreadsheet maintenance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Problems */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-16">
          The Reality Contractors Face
        </h2>

        <div className="space-y-12">
          <div className="border-l-4 border-red-500 pl-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Contacts scattered across inboxes and spreadsheets
            </h3>
            <p className="text-gray-600 mb-3">
              No one knows the full history of a client conversation.
            </p>
            <p className="text-gray-900 font-semibold">
              → Unified contact record with complete activity timeline
            </p>
          </div>

          <div className="border-l-4 border-red-500 pl-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Estimating disconnected from follow-up
            </h3>
            <p className="text-gray-600 mb-3">
              Estimates sent, but no one tracked if they called back.
            </p>
            <p className="text-gray-900 font-semibold">
              → Estimating anchored to contact with automatic activity logging
            </p>
          </div>

          <div className="border-l-4 border-red-500 pl-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Compliance enforced too late — or never
            </h3>
            <p className="text-gray-600 mb-3">
              Certifications expire, crews show up unprepared.
            </p>
            <p className="text-gray-900 font-semibold">
              → Owner-defined compliance with expiration tracking
            </p>
          </div>

          <div className="border-l-4 border-red-500 pl-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No audit trail when it matters
            </h3>
            <p className="text-gray-600 mb-3">
              "Who approved that?" becomes an investigation.
            </p>
            <p className="text-gray-900 font-semibold">
              → Immutable activity log. Every action. Forever.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
            How It Works
          </h2>
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-2 bg-blue-100 text-blue-900 font-semibold rounded-full text-sm">
              Nothing is enforced until the owner approves.
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                1
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Owner logs in</h3>
              <p className="text-gray-600 text-sm">Real credentials, real session</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                2
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Full system visible</h3>
              <p className="text-gray-600 text-sm">All modules accessible immediately</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                3
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Contacts anchor all work</h3>
              <p className="text-gray-600 text-sm">Every action ties to a contact</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                4
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Estimating drives revenue</h3>
              <p className="text-gray-600 text-sm">Built-in, versioned, auditable</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                5
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Compliance defined by you</h3>
              <p className="text-gray-600 text-sm">Your rules, your timeline</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                6
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Enforcement after sign-off</h3>
              <p className="text-gray-600 text-sm">Only when you're ready</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
          Everything You Need, Nothing You Don't
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="border border-gray-200 rounded-xl p-8">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Contacts & Activity</h3>
            <p className="text-gray-600">
              Unified contact records with complete, immutable activity timelines.
            </p>
          </div>

          <div className="border border-gray-200 rounded-xl p-8">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Tasks & Follow-Ups</h3>
            <p className="text-gray-600">
              Contact-anchored tasks with automatic activity logging on completion.
            </p>
          </div>

          <div className="border border-gray-200 rounded-xl p-8">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Estimating & Versions</h3>
            <p className="text-gray-600">
              Built-in estimating with line items, presets, and version control.
            </p>
          </div>

          <div className="border border-gray-200 rounded-xl p-8">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Compliance Visibility</h3>
            <p className="text-gray-600">
              Track certifications and expirations. Enforce only when ready.
            </p>
          </div>

          <div className="border border-gray-200 rounded-xl p-8">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Owner-Level Analytics</h3>
            <p className="text-gray-600">
              System health, engagement trends, and risk indicators — all derived.
            </p>
          </div>

          <div className="border border-gray-200 rounded-xl p-8 bg-gray-50">
            <div className="text-center">
              <p className="text-gray-600 mb-2">And more:</p>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Email integration</li>
                <li>• @mentions & notifications</li>
                <li>• Contact import</li>
                <li>• PDF generation</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Conversion Section */}
      <section id="pricing" className="bg-blue-600 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            See it working before you buy it.
          </h2>
          <p className="text-xl text-blue-100 mb-10">
            Schedule a live demo or talk to our team about licensing options.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Link 
              href="/request-demo"
              className="px-10 py-4 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition text-lg"
            >
              Request Demo
            </Link>
            <a 
              href="mailto:sales@contractorcrm.com"
              className="px-10 py-4 border-2 border-white text-white font-bold rounded-lg hover:bg-blue-700 transition text-lg"
            >
              Talk to Sales
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-8">
            <p className="text-lg text-gray-300 mb-4">
              Built for contractors who need control, visibility, and compliance — without the chaos.
            </p>
          </div>
          
          <div className="flex justify-center space-x-8 text-sm">
            <a href="/privacy" className="hover:text-white transition">Privacy</a>
            <a href="/terms" className="hover:text-white transition">Terms</a>
            <a href="mailto:info@contractorcrm.com" className="hover:text-white transition">Contact</a>
          </div>

          <div className="mt-8 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Contractor CRM. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
