import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {},

  serverExternalPackages: ['pdfkit', '@react-pdf/pdfkit', 'fontkit'],
}

export default nextConfig

