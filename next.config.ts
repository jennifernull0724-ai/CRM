import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {},
  compiler: {
    styledComponents: true,
  },
  serverExternalPackages: ['pdfkit', '@react-pdf/pdfkit', 'fontkit'],
}

export default nextConfig

