import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import {
  CheckCircle2,
  Users,
  FileText,
  Shield,
  BarChart3,
  ArrowRight,
  AlertCircle,
  Lightbulb,
} from 'lucide-react'

export default async function WelcomePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'OWNER') {
    redirect('/app/dashboard/user')
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 md:p-12 text-white mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <CheckCircle2 className="w-8 h-8" />
          <h1 className="text-3xl md:text-4xl font-bold">
            Welcome to Contractor CRM!
          </h1>
        </div>
        
        <p className="text-xl text-blue-100 mb-6">
          Your company license is active.
        </p>

        <div className="bg-blue-800 bg-opacity-50 rounded-lg p-6 space-y-3">
          <div className="flex items-start space-x-3">
            <Shield className="w-6 h-6 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-lg">You are the Owner</p>
              <p className="text-blue-100">
                You control enforcement, compliance, and access. You have full authority over this system.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-lg">Nothing is Locked. Nothing is Enforced Yet.</p>
              <p className="text-blue-100">
                The system is in OWNER_SETUP mode. You can explore, configure, and test everything without restrictions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* System Status Banner */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-yellow-600" />
            <div>
              <p className="font-bold text-yellow-900">System Status: OWNER_SETUP</p>
              <p className="text-sm text-yellow-700">Enforcement is OFF. All features are accessible for review and configuration.</p>
            </div>
          </div>
          <Link
            href="/app/settings/owner"
            className="px-4 py-2 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 transition whitespace-nowrap"
          >
            Manage Settings
          </Link>
        </div>
      </div>

      {/* Getting Started */}
      <div className="bg-white rounded-xl border border-gray-200 p-8 mb-8">
        <div className="flex items-center space-x-3 mb-6">
          <Lightbulb className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">
            Getting Started
          </h2>
        </div>

        <div className="space-y-6">
          {/* Step 1: Review System */}
          <div className="border-l-4 border-blue-500 pl-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Step 1: Review the System
            </h3>
            <p className="text-gray-600 mb-4">
              All modules are visible and accessible. Explore at your own pace — nothing is required to configure immediately.
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              <Link
                href="/app/contacts"
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-gray-900">Contacts</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </Link>

              <Link
                href="/app/estimating/queue"
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-gray-900">Estimating</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </Link>

              <Link
                href="/app/compliance"
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-gray-900">Compliance</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </Link>

              <Link
                href="/app/analytics"
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="flex items-center space-x-3">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-gray-900">Analytics</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </Link>
            </div>
          </div>

          {/* Step 2: Add Contacts */}
          <div className="border-l-4 border-green-500 pl-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Step 2: Add Your First Contacts
            </h3>
            <p className="text-gray-600 mb-4">
              Contacts are the foundation of the system. Every task, note, email, and estimate is anchored to a contact.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/app/contacts/new"
                className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition inline-flex items-center"
              >
                <Users className="w-4 h-4 mr-2" />
                Create Contact
              </Link>
              
              <Link
                href="/app/contacts/import"
                className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition inline-flex items-center"
              >
                <FileText className="w-4 h-4 mr-2" />
                Bulk Upload (CSV/Excel)
              </Link>
            </div>
          </div>

          {/* Step 3: Try Estimating */}
          <div className="border-l-4 border-purple-500 pl-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Step 3: Try Estimating
            </h3>
            <p className="text-gray-600 mb-4">
              Estimating drives revenue. Create estimates from contacts, use service presets, and track approvals. Approved estimates lock versions for audit integrity.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              <strong>Note:</strong> Estimating does NOT control contacts. Estimates are always anchored to contacts, not the other way around.
            </p>
            <Link
              href="/app/estimating/queue"
              className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition inline-flex items-center"
            >
              <FileText className="w-4 h-4 mr-2" />
              View Estimating Queue
            </Link>
          </div>

          {/* Step 4: Define Compliance */}
          <div className="border-l-4 border-orange-500 pl-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Step 4: Define Compliance (Optional, Not Enforced)
            </h3>
            <p className="text-gray-600 mb-4">
              Compliance rules are owner-defined. Upload certifications, define requirements, and set expirations. Enforcement is OFF until you explicitly approve it.
            </p>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-orange-800">
                <strong>Important:</strong> Compliance is for visibility and audit readiness. It will NOT block any actions until you transition the system to enforcement mode.
              </p>
            </div>
            <Link
              href="/app/compliance"
              className="px-4 py-2 border border-orange-500 text-orange-700 font-semibold rounded-lg hover:bg-orange-50 transition inline-flex items-center"
            >
              <Shield className="w-4 h-4 mr-2" />
              Configure Compliance
            </Link>
          </div>

          {/* Step 5: Invite Users */}
          <div className="border-l-4 border-indigo-500 pl-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Step 5: Invite Users
            </h3>
            <p className="text-gray-600 mb-4">
              Invite team members and assign roles. Users inherit access from your rules. You always override any restrictions.
            </p>
            <div className="space-y-2 mb-4 text-sm text-gray-600">
              <p><strong>Admin:</strong> Manage users, contacts, and compliance</p>
              <p><strong>User/Sales:</strong> Work contacts, tasks, and estimates</p>
              <p><strong>Estimator:</strong> Access estimates with read-only contact context</p>
              <p><strong>Field:</strong> QR verification only (no CRM UI access)</p>
            </div>
            <Link
              href="/app/settings/admin"
              className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition inline-flex items-center"
            >
              <Users className="w-4 h-4 mr-2" />
              Manage Users
            </Link>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-3">
          Ready to Get Started?
        </h3>
        <p className="text-gray-600 mb-4">
          When you're comfortable with the system, you can transition from OWNER_SETUP to enforcement mode in your settings.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/app/dashboard/owner"
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition inline-flex items-center"
          >
            Go to Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
          
          <Link
            href="/app/contacts"
            className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
          >
            Start with Contacts
          </Link>
        </div>
      </div>

      {/* Footer Note */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>You can return to this page anytime from Settings → Owner → Getting Started</p>
      </div>
    </div>
  )
}
