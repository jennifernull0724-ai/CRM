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
    <header className="border-b border-gray-200 bg-white">
      <div className="flex h-16 items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 text-xl font-semibold tracking-wide" onClick={closeMobile}>
          <Image src="/T-REX (1).png" alt="T-REX AI OS" width={180} height={60} className="h-14 w-auto" />
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {navLinks.map((item) => (
            <Link key={item.href} href={item.href} className="text-[#050d1a]/70 transition hover:text-[#050d1a]">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 text-sm font-semibold md:flex">
          <Link href="/login" className="text-[#050d1a]/70 transition hover:text-[#050d1a]">
            Login
          </Link>
          <Link
            href="/signup"
            className="rounded-md border border-orange-500 bg-orange-500 px-4 py-2 text-white transition hover:bg-orange-600 hover:border-orange-600"
          >
            Create Account
          </Link>
        </div>
        <button
          type="button"
          className="rounded border border-gray-300 p-2 text-[#050d1a] md:hidden"
          aria-label="Toggle navigation"
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          <span className="block h-[2px] w-5 bg-[#050d1a]" />
          <span className="mt-1 block h-[2px] w-5 bg-[#050d1a]" />
          <span className="mt-1 block h-[2px] w-5 bg-[#050d1a]" />
        </button>
      </div>
      {mobileOpen ? (
        <div className="md:hidden">
          <nav className="border-t border-gray-200 bg-white px-4 py-4 text-sm font-medium">
            <div className="space-y-3">
              {navLinks.map((item) => (
                <Link key={item.href} href={item.href} className="block text-[#050d1a]/80" onClick={closeMobile}>
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/login"
                className="w-full rounded-sm border border-gray-300 px-4 py-3 text-center text-[#050d1a]"
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
