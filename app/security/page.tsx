import Link from 'next/link'

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="text-2xl font-bold text-white">
            T-REX AI OS
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-white mb-8">Security & Governance</h1>

        <div className="space-y-12">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Access Control</h2>
            <div className="space-y-4 text-gray-400">
              <p>Role-based access control enforced at the server level. Every API call validates permissions before executing.</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Owner: Full system access including billing and compliance</li>
                <li>Admin: Full operational access including user management and compliance</li>
                <li>Estimator: Can create and approve estimates, manage deals</li>
                <li>User: Can create contacts and deals, cannot edit pricing or approve</li>
                <li>Field: Limited access to assigned projects only</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Audit Logs</h2>
            <div className="space-y-4 text-gray-400">
              <p>Every action is logged to an append-only activity table. No edits, no deletions.</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Contact creation, updates, archiving</li>
                <li>Deal creation, stage changes, approvals</li>
                <li>Estimate modifications and approvals</li>
                <li>PDF generation and distribution</li>
                <li>Compliance record changes</li>
                <li>User actions and role changes</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Document Versioning</h2>
            <div className="space-y-4 text-gray-400">
              <p>All estimates are versioned. PDFs are generated on approval and stored immutably.</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Each estimate revision creates a new version</li>
                <li>Approved PDFs cannot be modified or deleted</li>
                <li>SHA-256 hashing verifies file integrity</li>
                <li>Complete version history preserved</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Data Storage</h2>
            <div className="space-y-4 text-gray-400">
              <p>All files stored in AWS S3 with server-side encryption. No public access.</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Server-side uploads only</li>
                <li>Signed download URLs with expiration</li>
                <li>Compliance documents segregated by company</li>
                <li>Automatic backup and replication</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Retention Controls</h2>
            <div className="space-y-4 text-gray-400">
              <p>Data retention policies enforced at the system level.</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Activity logs retained indefinitely</li>
                <li>Approved PDFs retained per compliance requirements</li>
                <li>Archived contacts retain full history</li>
                <li>Deleted users preserve attribution in logs</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Compliance Module</h2>
            <div className="space-y-4 text-gray-400">
              <p>Owner and Admin only. Complete employee certification tracking with QR verification.</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Mandatory proof files for all certifications</li>
                <li>Expiration tracking and alerts</li>
                <li>Public QR verification pages (read-only)</li>
                <li>QR scan logging for audit trail</li>
                <li>Deterministic compliance snapshots</li>
              </ul>
            </div>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800">
          <Link href="/" className="text-orange-500 hover:text-orange-400">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
