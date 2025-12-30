import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { resolveRoleDestination } from '@/lib/auth/roleDestinations'
import { prisma } from '@/lib/prisma'
import { linkEmailToContactAction, createContactAndLinkAction } from './actions'

function extractEmail(address: string): string {
  const match = address.match(/<([^>]+)>/)
  if (match?.[1]) return match[1]
  return address.trim()
}

export default async function InboundEmailReviewPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.companyId) {
    redirect('/login')
  }

  const role = session.user.role?.toLowerCase()
  if (!['owner', 'admin'].includes(role ?? '')) {
    redirect(resolveRoleDestination(role))
  }

  const companyId = session.user.companyId

  const [unlinkedEmails, linkedCount] = await Promise.all([
    prisma.email.findMany({
      where: { companyId, direction: 'INBOUND', requiresContactResolution: true },
      orderBy: { receivedAt: 'desc' },
      include: { attachments: { select: { id: true } } },
    }),
    prisma.email.count({ where: { companyId, direction: 'INBOUND', requiresContactResolution: false } }),
  ])

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Inbound Email Review Queue</h1>
        <p className="text-sm text-gray-600">Owner/Admin can link unlinked inbound emails to contacts. No automatic contact creation.</p>
        <div className="flex items-center gap-4 text-sm text-gray-700">
          <span className="font-semibold">Unlinked:</span>
          <span className="rounded bg-amber-100 px-2 py-1 text-amber-800">{unlinkedEmails.length}</span>
          <span className="font-semibold">Linked Inbound:</span>
          <span className="rounded bg-emerald-100 px-2 py-1 text-emerald-800">{linkedCount}</span>
        </div>
      </div>

      {unlinkedEmails.length === 0 ? (
        <div className="rounded border border-gray-200 bg-white p-4 text-sm text-gray-700">All inbound emails are linked.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {unlinkedEmails.map((email) => {
            const guessedEmail = extractEmail(email.fromAddress)
            return (
              <div key={email.id} className="rounded border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex justify-between text-xs text-gray-500">
                  <span>{email.receivedAt ? new Date(email.receivedAt).toLocaleString() : 'Received date unknown'}</span>
                  <span>{email.attachments.length} attachment(s)</span>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-900">{email.subject}</div>
                  <div className="text-sm text-gray-700">From: {email.fromAddress}</div>
                  <div className="text-sm text-gray-700 line-clamp-3">{email.snippet}</div>
                </div>

                <div className="mt-4 space-y-3">
                  <form action={linkEmailToContactAction} className="space-y-2 rounded border border-gray-200 p-3">
                    <input type="hidden" name="emailId" value={email.id} />
                    <div className="text-sm font-semibold text-gray-900">Link to existing contact</div>
                    <label className="block text-xs font-medium text-gray-600" htmlFor={`contact-${email.id}`}>
                      Contact ID
                    </label>
                    <input
                      id={`contact-${email.id}`}
                      name="contactId"
                      placeholder="contact id"
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                      required
                    />
                    <button
                      type="submit"
                      className="w-full rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      Link to Contact
                    </button>
                  </form>

                  <form action={createContactAndLinkAction} className="space-y-2 rounded border border-gray-200 p-3">
                    <input type="hidden" name="emailId" value={email.id} />
                    <div className="text-sm font-semibold text-gray-900">Create new contact then link</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600" htmlFor={`first-${email.id}`}>
                          First name
                        </label>
                        <input
                          id={`first-${email.id}`}
                          name="firstName"
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600" htmlFor={`last-${email.id}`}>
                          Last name
                        </label>
                        <input
                          id={`last-${email.id}`}
                          name="lastName"
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                          required
                        />
                      </div>
                    </div>
                    <label className="block text-xs font-medium text-gray-600" htmlFor={`email-${email.id}`}>
                      Email
                    </label>
                    <input
                      id={`email-${email.id}`}
                      name="contactEmail"
                      defaultValue={guessedEmail}
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                      required
                    />
                    <label className="block text-xs font-medium text-gray-600" htmlFor={`owner-${email.id}`}>
                      Owner ID (optional)
                    </label>
                    <input
                      id={`owner-${email.id}`}
                      name="ownerId"
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                      placeholder="owner user id"
                    />
                    <button
                      type="submit"
                      className="w-full rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                    >
                      Create Contact & Link
                    </button>
                  </form>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
