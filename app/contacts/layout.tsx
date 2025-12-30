import type { ReactNode } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Navigation from '@/components/navigation'
import { authOptions } from '@/lib/auth'

export default async function ContactsLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/login')
  }

  if (!session.user.companyId) {
    redirect('/signup')
  }

  return (
    <>
      <Navigation role={session.user.role} userName={session.user.name} />
      {children}
    </>
  )
}
