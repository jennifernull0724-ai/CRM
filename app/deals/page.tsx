import Link from 'next/link'
import { prisma } from '@/lib/prisma'
export const dynamic = 'force-dynamic'

export default async function DealsPage() {
  const deals = await prisma.deal.findMany({
    include: {
      contact: true,
      company: true,
      assignedTo: true,
      _count: {
        select: {
          lineItems: true,
          versions: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  })

  // Group deals by stage
  const dealsByStage = deals.reduce((acc, deal) => {
    if (!acc[deal.stage]) {
      acc[deal.stage] = []
    }
    acc[deal.stage].push(deal)
    return acc
  }, {} as Record<string, typeof deals>)

  const stages = ['New', 'Qualifying', 'Estimating', 'Proposal Sent', 'Negotiation', 'Won', 'Lost']

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Deal Pipeline</h1>
          <Link
            href="/deals/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
          >
            + New Deal
          </Link>
        </div>

        {/* Pipeline View */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {stages.map((stage) => (
            <div key={stage} className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">
                  {stage}
                  <span className="ml-2 text-sm text-gray-500">
                    ({dealsByStage[stage]?.length || 0})
                  </span>
                </h2>
              </div>
              <div className="p-4 space-y-3">
                {(dealsByStage[stage] || []).length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No deals</p>
                ) : (
                  dealsByStage[stage].map((deal) => (
                    <Link
                      key={deal.id}
                      href={`/deals/${deal.id}`}
                      className="block p-3 border border-gray-200 rounded hover:bg-gray-50"
                    >
                      <h3 className="font-medium text-gray-900 text-sm">{deal.name}</h3>
                      <p className="text-xs text-gray-600 mt-1">
                        {deal.contact.firstName} {deal.contact.lastName}
                      </p>
                      {deal.company && (
                        <p className="text-xs text-gray-600">{deal.company.name}</p>
                      )}
                      {deal.value && (
                        <p className="text-sm font-semibold text-gray-900 mt-2">
                          ${deal.value.toLocaleString()}
                        </p>
                      )}
                      {deal.assignedTo && (
                        <p className="text-xs text-gray-500 mt-1">
                          Estimator: {deal.assignedTo.name}
                        </p>
                      )}
                    </Link>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Table View Toggle - could add later */}
      </div>
    </div>
  )
}
