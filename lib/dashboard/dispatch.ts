import { loadDispatchDashboard, type DispatchDashboardData } from '@/lib/dispatch/dashboard'
import { loadDispatchRoleMetrics, type DispatchRoleMetrics } from '@/lib/dispatch/analytics'
import { loadDispatchBoard } from '@/lib/dispatch/workOrders'
import { getAssetDashboardSummary, type AssetDashboardSummary } from '@/lib/assets/registry'
import { ensureCompanyBootstrap } from '@/lib/system/bootstrap'

export type DispatchDashboardBundle = {
  dashboard: DispatchDashboardData
  orders: Awaited<ReturnType<typeof loadDispatchBoard>>
  summary: AssetDashboardSummary
  roleMetrics: DispatchRoleMetrics
}

export async function loadDispatchDashboardBundle(companyId: string): Promise<DispatchDashboardBundle> {
  // Ensure workspace has minimum required system records
  await ensureCompanyBootstrap(companyId)

  const [dashboard, orders, summary, roleMetrics] = await Promise.all([
    loadDispatchDashboard(companyId),
    loadDispatchBoard(companyId),
    getAssetDashboardSummary(companyId),
    loadDispatchRoleMetrics(companyId),
  ])

  return {
    dashboard,
    orders,
    summary,
    roleMetrics,
  }
}
