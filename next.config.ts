import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdfkit', '@react-pdf/pdfkit', 'fontkit'],
}

export default nextConfig
