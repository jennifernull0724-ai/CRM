import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

export default function ThankYouPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Contractor CRM
            </h1>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Thank You!
            </h2>
            
            <p className="text-gray-600 mb-8">
              We've received your demo request and will be in touch shortly.
            </p>

            <div className="space-y-4">
              <Link
                href="/"
                className="block w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition text-center"
              >
                Back to Home
              </Link>
              
              <Link
                href="/login"
                className="block w-full py-3 px-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:border-gray-400 transition text-center"
              >
                Owner Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
