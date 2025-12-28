import Link from 'next/link'

export default function UpgradeSuccessPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4 bg-slate-900 border border-slate-800 rounded-2xl p-8">
        <p className="text-4xl">✅</p>
        <h1 className="text-2xl font-semibold">Checkout complete</h1>
        <p className="text-slate-300 text-sm">
          Stripe confirmed your payment method. Finalizing the subscription requires the webhook to mark your
          workspace as paid. You can close this tab or return to the app while we finish provisioning.
        </p>
        <Link
          href="/dashboard/user"
          className="inline-flex justify-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          Return to dashboard
        </Link>
        <p className="text-xs text-slate-500">
          Need help? Email support and include your Stripe checkout session ID from the receipt.
        </p>
      </div>
    </div>
  )
}
