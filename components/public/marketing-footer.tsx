import Link from 'next/link'

const footerLinks = [
  { label: 'Pricing', href: '/pricing' },
  { label: 'Security', href: '/security' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Contact Support', href: '/support' },
]

export function MarketingFooter() {
  return (
    <footer className="border-t border-[#d7dbe2] bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-lg font-semibold text-[#051025]">T-REX AI OS</p>
          <p className="text-sm text-[#4c566a]">Control system for regulated operations.</p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm font-medium text-[#051025]">
          {footerLinks.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-orange-500">
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}
