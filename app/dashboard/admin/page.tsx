import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { loadControlPlaneData } from '@/lib/dashboard/controlPlane'
import { ControlPlaneDashboard } from '@/app/dashboard/_components/control-plane-dashboard'

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login?from=/dashboard/admin')
  }

  if (!session.user.companyId) {
    redirect('/signup')
  }

  const role = session.user.role.toLowerCase()

  if (role === 'owner') {
    redirect('/dashboard/owner')
  }

  if (role !== 'admin') {
    redirect('/dashboard/user')
  }

  const data = await loadControlPlaneData(session.user.companyId)

  return <ControlPlaneDashboard variant="admin" data={data} planKey={session.user.planKey} />
}
