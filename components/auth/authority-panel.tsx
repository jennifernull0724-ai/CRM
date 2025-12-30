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
          <p className="text-xs uppercase tracking-[0.5em] text-white/60">T-REX AI OS</p>
          <h1 className="text-3xl font-semibold leading-tight">Operational Control System</h1>
        </div>
        <div className="h-px bg-white/20" />
        <ul className="space-y-3 text-sm text-white/80">
          <li>Role-based access control</li>
          <li>Server-enforced workflows</li>
          <li>Immutable audit history</li>
          <li>Authorized access only</li>
        </ul>
      </div>
      <p className="text-xs uppercase tracking-[0.3em] text-white/40">Perimeter secured</p>
    </section>
  )
}
