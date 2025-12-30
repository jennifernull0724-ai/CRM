"use client"

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const navLinks = [
  { label: 'Pricing', href: '/pricing' },
  { label: 'Security', href: '/security' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Support', href: '/support' },
]

export function MarketingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)

  const closeMobile = () => setMobileOpen(false)

  return (
    <header className="border-b border-white/10 bg-[#050d1a] text-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-semibold tracking-wide text-white" onClick={closeMobile}>
          <Image src="/og/T-REX.png" alt="T-REX AI OS" width={120} height={40} className="h-10 w-auto" />
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {navLinks.map((item) => (
            <Link key={item.href} href={item.href} className="text-white/80 transition hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 text-sm font-semibold md:flex">
          <Link href="/login" className="text-white/70 transition hover:text-white">
            Login
          </Link>
          <Link
            href="/signup"
            className="rounded-md border border-orange-500/60 px-4 py-2 text-orange-400 transition hover:border-orange-400 hover:text-white"
          >
            Create Account
          </Link>
        </div>
        <button
          type="button"
          className="rounded border border-white/20 p-2 text-white md:hidden"
          aria-label="Toggle navigation"
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          <span className="block h-[2px] w-5 bg-white" />
          <span className="mt-1 block h-[2px] w-5 bg-white" />
          <span className="mt-1 block h-[2px] w-5 bg-white" />
        </button>
      </div>
      {mobileOpen ? (
        <div className="md:hidden">
          <nav className="border-t border-white/10 px-4 py-4 text-sm font-medium">
            <div className="space-y-3">
              {navLinks.map((item) => (
                <Link key={item.href} href={item.href} className="block text-white/90" onClick={closeMobile}>
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/login"
                className="w-full rounded-sm border border-white/30 px-4 py-3 text-center text-white"
                onClick={closeMobile}
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="w-full rounded-sm bg-orange-500 px-4 py-3 text-center text-sm font-semibold text-white"
                onClick={closeMobile}
              >
                Create Account
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  )
}
