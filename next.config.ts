import type { NextConfig } from 'next'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const swcHelperEntry = require.resolve('@swc/helpers/src/index.js')

const nextConfig: NextConfig = {
  turbopack: {},

  serverExternalPackages: ['pdfkit', '@react-pdf/pdfkit', 'fontkit'],

  webpack: (config) => {
    config.resolve = config.resolve ?? {}
    config.resolve.alias = {
      ...config.resolve.alias,
      '@swc/helpers': swcHelperEntry,
    }
    return config
  },
}

export default nextConfig

