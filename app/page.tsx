import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white mb-6">
            T-REX CRM
          </h1>
          <p className="text-xl text-slate-300 mb-4">
            Deal-Centric Customer Relationship Management
          </p>
          <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto">
            Purpose-built for Construction, Railroad & Environmental industries.
            Manage contacts, track deals, create estimates, and close more business.
          </p>
          
          <div className="flex gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 text-lg font-semibold"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="bg-slate-700 text-white px-8 py-3 rounded-lg hover:bg-slate-600 text-lg font-semibold"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          Built for Your Industry
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-white mb-3">Deal Pipeline</h3>
            <p className="text-slate-300">
              HubSpot-style pipeline management. Track deals from first contact to close.
              Visual workflow keeps your team aligned.
            </p>
          </div>
          
          <div className="bg-slate-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-white mb-3">Built-in Estimating</h3>
            <p className="text-slate-300">
              Create detailed estimates within each deal. Version control, approval workflows,
              and professional PDF generation.
            </p>
          </div>
          
          <div className="bg-slate-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-white mb-3">Industry Presets</h3>
            <p className="text-slate-300">
              Pre-configured templates for Construction, Railroad, and Environmental projects.
              Start fast, customize as needed.
            </p>
          </div>
          
          <div className="bg-slate-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-white mb-3">Contact Management</h3>
            <p className="text-slate-300">
              All deals anchor to contacts. Complete activity history, tasks, notes, and
              email tracking in one place.
            </p>
          </div>
          
          <div className="bg-slate-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-white mb-3">Role-Based Access</h3>
            <p className="text-slate-300">
              User, Estimator, Admin, and Owner roles. Controlled permissions for pricing,
              approvals, and compliance.
            </p>
          </div>
          
          <div className="bg-slate-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-white mb-3">Audit Ready</h3>
            <p className="text-slate-300">
              Append-only activity logs. Version-controlled estimates. Document management
              for regulated operations.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 className="text-3xl font-bold text-white mb-6">
          Ready to Transform Your Sales Process?
        </h2>
        <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
          Join industry leaders who trust T-REX CRM to manage their deals and grow their business.
        </p>
        <Link
          href="/pricing"
          className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 text-lg font-semibold inline-block"
        >
          View Pricing
        </Link>
      </div>
    </div>
  );
}
