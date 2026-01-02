import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ContactCreateSheet } from '@/components/contacts/contact-create-sheet'
import { AppLayout } from '@/ui/layouts/AppLayout'
import { GlobalHeader } from '@/ui/app-shell/GlobalHeader'
import { PrimaryNavRail } from '@/ui/app-shell/PrimaryNavRail'
import { ObjectSubNav } from '@/ui/app-shell/ObjectSubNav'
import { PrimaryNavItem } from '@/ui/navigation/PrimaryNavItem'
import { ActiveRouteIndicator } from '@/ui/navigation/ActiveRouteIndicator'
import { ObjectIndexLayout } from '@/ui/layouts/ObjectIndexLayout'
import { IndexToolbar } from '@/ui/index-table/IndexToolbar'
import { IndexTableShell } from '@/ui/index-table/IndexTableShell'
import { IndexEmptyState } from '@/ui/index-table/IndexEmptyState'
import { Pill } from '@/ui/primitives/Pill'

type SearchParams = Record<string, string | string[] | undefined>

const primaryNav = [
  { label: 'Contacts', href: '/contacts' },
  { label: 'Companies', href: '/companies' },
  { label: 'Deals', href: '/deals' },
  { label: 'Tickets', href: '/tickets' },
  { label: 'Reports', href: '/reports' },
  { label: 'Automation', href: '/automation' },
  { label: 'Settings', href: '/settings' },
]

export default async function ContactsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.companyId) {
    redirect('/login?from=/contacts')
  }

  const search = typeof searchParams.search === 'string' ? searchParams.search.trim() : ''

  const contacts = await prisma.contact.findMany({
    where: {
      companyId: session.user.companyId,
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      jobTitle: true,
      archived: true,
      owner: { select: { name: true } },
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return (
    <AppLayout
      header={<GlobalHeader leftSlot={<span className="text-sm font-semibold text-slate-800">Contacts</span>} rightSlot={<Pill tone="accent">Index</Pill>} />}
      primaryNav={
        <PrimaryNavRail>
          {primaryNav.map((item) => (
            <div key={item.label} className="grid grid-cols-[6px_1fr] items-center gap-2 px-2">
              <ActiveRouteIndicator isActive={item.href.startsWith('/contacts')} />
              <PrimaryNavItem label={item.label} isActive={item.href.startsWith('/contacts')} />
            </div>
          ))}
        </PrimaryNavRail>
      }
      subNav={<ObjectSubNav>All contacts</ObjectSubNav>}
    >
      <div className="mx-auto max-w-6xl space-y-4 p-6">
        <ObjectIndexLayout
          toolbar={
            <IndexToolbar actions={<ContactCreateSheet source="contacts:index" triggerLabel="New contact" variant="solid" />}>
              <span className="text-sm font-semibold text-slate-800">Workspace contacts</span>
            </IndexToolbar>
          }
          filters={
            <form className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 pb-4 pt-2 text-sm" method="GET">
              <label className="text-xs font-semibold text-slate-600">
                Search
                <input
                  name="search"
                  defaultValue={search}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                />
              </label>
              <button
                type="submit"
                className="w-fit rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-600"
              >
                Apply
              </button>
            </form>
          }
          table={
            <IndexTableShell>
              {contacts.length === 0 ? (
                <IndexEmptyState />
              ) : (
                <div className="divide-y divide-slate-200">
                  {contacts.map((contact) => (
                    <div key={contact.id} className="flex items-center justify-between gap-3 py-3 text-sm text-slate-800">
                      <div>
                        <div className="font-semibold text-slate-900">
                          <a href={`/contacts/${contact.id}`} className="hover:underline">
                            {contact.firstName} {contact.lastName}
                          </a>
                        </div>
                        <div className="text-xs text-slate-500">{contact.email}</div>
                        <div className="text-xs text-slate-500">{contact.jobTitle ?? 'No title'}</div>
                      </div>
                      <div className="text-xs text-slate-500">Owner: {contact.owner?.name ?? 'Unassigned'}</div>
                      <div className="text-xs text-slate-500">Archived: {contact.archived ? 'Yes' : 'No'}</div>
                    </div>
                  ))}
                </div>
              )}
            </IndexTableShell>
          }
        />
      </div>
    </AppLayout>
  )
}
