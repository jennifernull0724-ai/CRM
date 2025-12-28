import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { loadControlPlaneData } from '@/lib/dashboard/controlPlane'
import { ControlPlaneDashboard } from '@/app/dashboard/_components/control-plane-dashboard'

export default async function OwnerDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login?from=/dashboard/owner')
  }

  if (!session.user.companyId) {
    redirect('/signup')
  }

  const role = session.user.role.toLowerCase()

  if (role !== 'owner') {
    redirect('/dashboard/admin')
  }

  const data = await loadControlPlaneData(session.user.companyId)

  return <ControlPlaneDashboard variant="owner" data={data} planKey={session.user.planKey} />
}
