import Link from 'next/link'

type RequestDemoPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

const getSearchParam = (value?: string | string[]): string | null => {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }
  return value ?? null
}

export default function RequestDemoPage({ searchParams }: RequestDemoPageProps) {
  const success = getSearchParam(searchParams?.success)
  const errorFlag = getSearchParam(searchParams?.error)
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL

  if (success === 'true') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-gray-900 p-8 rounded-lg border border-gray-800">
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <h1 className="text-2xl font-bold text-white mb-4">Request Received</h1>
            <p className="text-gray-400 mb-6">
              We&apos;ll contact you within 24 hours to schedule your live walkthrough.
            </p>
            <Link
              href="/"
              className="inline-block bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 font-medium"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link href="/" className="text-orange-500 hover:text-orange-400 mb-8 inline-block">
          ← Back to home
        </Link>
        
        <h1 className="text-4xl font-bold text-white mb-4">Request Demo</h1>
        <p className="text-gray-400 mb-8">
          See the production system. No sandbox, no simulations.
        </p>

        <div className="bg-gray-900 p-8 rounded-lg border border-gray-800 space-y-6">
          {errorFlag === 'true' && (
            <div className="rounded border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              Something went wrong while submitting your request. Please try again shortly
              {supportEmail ? ` or email ${supportEmail}` : ''}.
            </div>
          )}

          <form action="/api/forms/request-demo" method="POST" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="w-full px-4 py-3 bg-gray-950 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-300 mb-2">
                  Company *
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  required
                  className="w-full px-4 py-3 bg-gray-950 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                className="w-full px-4 py-3 bg-gray-950 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label htmlFor="industry" className="block text-sm font-medium text-gray-300 mb-2">
                Industry focus *
              </label>
              <p className="text-xs text-gray-500 mb-2">
                This helps us tailor your demo — it does not limit or change platform functionality.
              </p>
              <select
                id="industry"
                name="industry"
                required
                className="w-full px-4 py-3 bg-gray-950 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Select industry</option>
                <option value="construction">Construction</option>
                <option value="railroad">Railroad</option>
                <option value="environmental">Environmental</option>
                <option value="other">Other</option>
                <option value="multiple">Multiple / Not Sure</option>
              </select>
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                Message (optional)
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                className="w-full px-4 py-3 bg-gray-950 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full bg-orange-600 text-white px-6 py-4 rounded-lg hover:bg-orange-700 font-semibold text-lg"
            >
              Request Demo
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
