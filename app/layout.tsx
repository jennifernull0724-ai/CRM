import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL('https://trexaios.com'),
  title: 'T-REX AI OS',
  description:
    'Operational control system for construction, railroad, and environmental teams with enforced CRM, estimating, dispatch, and compliance workflows.',
  robots: {
    index: false,
    follow: false,
  },
  manifest: '/manifest.json',
  themeColor: '#050d1a',
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    apple: [
      { url: '/apple-icon-180x180.png', sizes: '180x180', type: 'image/png' },
      { url: '/apple-icon-152x152.png', sizes: '152x152', type: 'image/png' },
    ],
    shortcut: ['/favicon.ico'],
  },
  other: {
    'msapplication-config': '/browserconfig.xml',
    'msapplication-TileColor': '#050d1a',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`antialiased bg-[#f5f6f9] text-[#0b1220] ${inter.className}`}>
        {children}
      </body>
    </html>
  )
}
