type AuthorityPanelProps = {
  className?: string
}

export function AuthorityPanel({ className = '' }: AuthorityPanelProps) {
  return (
    <section
      className={`flex h-full min-h-[320px] flex-col justify-between bg-[#050d1a] px-6 py-12 text-white sm:px-8 ${className}`.trim()}
    >
      <div className="space-y-6">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold leading-tight">Secure System Access</h1>
          <p className="text-base text-white/70">Restricted access for authorized personnel only.</p>
        </div>
        <div className="h-px bg-white/20" />
        <div className="space-y-4">
          <p className="text-sm text-white/80 leading-relaxed">
            This system is licensed and provisioned at the organizational level.
          </p>
          <p className="text-sm text-white/80 leading-relaxed">
            Access is limited to users who have been explicitly added to an approved workspace by a system administrator.
          </p>
        </div>
        <ul className="space-y-3 text-sm text-white/80">
          <li>• Role-based permissions enforced server-side</li>
          <li>• All activity is logged and auditable</li>
          <li>• Credentials are issued and managed internally</li>
        </ul>
        <div className="rounded-sm border border-white/20 bg-white/5 px-4 py-3">
          <p className="text-xs text-white/70 leading-relaxed">
            If you are experiencing issues signing in, contact your organization's administrator or reach out to system support for assistance.
          </p>
        </div>
      </div>
      <p className="text-xs text-white/40">Unauthorized access is prohibited.</p>
    </section>
  )
}
