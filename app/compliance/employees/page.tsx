import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createEmployeeAction } from './actions'
import { planAllowsFeature, type PlanKey } from '@/lib/billing/planTiers'
import type { ComplianceStatus, Prisma } from '@prisma/client'

const STATUS_ORDER: Record<string, number> = { FAIL: 0, INCOMPLETE: 1, PASS: 2 }
const STATUS_STYLES: Record<string, string> = {
  PASS: 'bg-emerald-100 text-emerald-700',
  FAIL: 'bg-rose-100 text-rose-700',
  INCOMPLETE: 'bg-amber-100 text-amber-700',
}

function formatDate(date: Date | null) {
  if (!date) return '—'
  return date.toLocaleDateString()
}

type SearchParams = { [key: string]: string | string[] | undefined }

function parseBooleanParam(value: string | string[] | undefined) {
  if (!value) return false
  const normalized = Array.isArray(value) ? value[0] : value
  return normalized === 'true' || normalized === 'on' || normalized === '1'
}

type EmployeeWithRelations = Prisma.ComplianceEmployeeGetPayload<{
  include: {
    certifications: {
      select: {
        id: true
        required: true
        status: true
        expiresAt: true
      }
    }
    snapshots: {
      orderBy: { createdAt: 'desc' }
      take: 1
    }
  }
}>

type EmployeeFilters = {
  status: string
  role: string
  missing: boolean
  expiring: boolean
}

function buildEmployeeRows(employees: EmployeeWithRelations[], filters: EmployeeFilters) {
  const now = Date.now()
  const dayInMs = 1000 * 60 * 60 * 24

  return employees
    .map((employee) => {
      const missingCerts = employee.certifications.filter(
        (cert) => cert.required && cert.status !== 'PASS'
      ).length

      const expiringCerts = employee.certifications.filter((cert) => {
        if (cert.status !== 'PASS') return false
        const daysUntilExpiry = (cert.expiresAt.getTime() - now) / dayInMs
        return daysUntilExpiry <= 30
      }).length

      const lastSnapshot = employee.snapshots[0]
      const ageDays = lastSnapshot
        ? (now - lastSnapshot.createdAt.getTime()) / dayInMs
        : Number.POSITIVE_INFINITY

      let qrStatus = 'No snapshot'
      if (Number.isFinite(ageDays)) {
        qrStatus = ageDays > 30 ? 'Refresh' : 'Active'
      }

      return {
        ...employee,
        missingCerts,
        expiringCerts,
        qrStatus,
      }
    })
    .filter((employee) => {
      if (filters.missing && employee.missingCerts === 0) {
        return false
      }
      if (filters.expiring && employee.expiringCerts === 0) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      const statusDiff = STATUS_ORDER[a.complianceStatus] - STATUS_ORDER[b.complianceStatus]
      if (statusDiff !== 0) return statusDiff
      if (b.expiringCerts !== a.expiringCerts) return b.expiringCerts - a.expiringCerts
      return b.missingCerts - a.missingCerts
    })
}

export default async function ComplianceEmployeesPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.companyId) {
    throw new Error('Missing company context')
  }

  const planKey = (session.user.planKey as PlanKey) ?? 'starter'
  const isAdvanced = planAllowsFeature(planKey, 'advanced_compliance')

  const filters = {
    status: (searchParams.status as string) || '',
    role: (searchParams.role as string) || '',
    missing: parseBooleanParam(searchParams.missing),
    expiring: parseBooleanParam(searchParams.expiring),
  }

  const employees = await prisma.complianceEmployee.findMany({
    where: {
      companyId: session.user.companyId,
      complianceStatus: filters.status ? (filters.status as ComplianceStatus) : undefined,
      role: filters.role || undefined,
    },
    include: {
      certifications: {
        select: {
          id: true,
          required: true,
          status: true,
          expiresAt: true,
        },
      },
      snapshots: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  const enriched = buildEmployeeRows(employees, filters)

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-500">Compliance</p>
            <h1 className="text-3xl font-semibold text-slate-900">Employee roster</h1>
            <p className="text-slate-600">Real-time compliance state with missing proof counts, expiring certs, and QR readiness.</p>
          </div>
          <form action={createEmployeeAction} className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4 md:w-96">
            <p className="text-sm font-semibold text-slate-700">Add employee</p>
            <div className="grid gap-2">
              <input name="employeeId" placeholder="Employee ID" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" required />
              <input name="email" type="email" placeholder="Work email" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" required />
              <div className="grid grid-cols-2 gap-2">
                <input name="firstName" placeholder="First name" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" required />
                <input name="lastName" placeholder="Last name" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" required />
              </div>
              <input name="title" placeholder="Role / title" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" required />
              <input name="role" placeholder="Deployment role" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" required />
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" name="active" defaultChecked className="rounded" /> Active
              </label>
            </div>
            <button type="submit" className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Create employee</button>
          </form>
        </div>
      </div>

      <form className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-5">
          <div>
            <label className="text-xs uppercase text-slate-500">Status</label>
            <select name="status" defaultValue={filters.status} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="">All</option>
              <option value="FAIL">Fail</option>
              <option value="INCOMPLETE">Incomplete</option>
              <option value="PASS">Pass</option>
            </select>
          </div>
          <div>
            <label className="text-xs uppercase text-slate-500">Role</label>
            <input name="role" defaultValue={filters.role} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="missing" defaultChecked={filters.missing} className="rounded" /> Missing certs
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="expiring" defaultChecked={filters.expiring} className="rounded" /> Expiring soon
          </label>
          <div className="flex items-end justify-end">
            <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Filter</button>
          </div>
        </div>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <form
          method="POST"
          action="/api/compliance/print/bulk"
          className="overflow-x-auto"
        >
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {isAdvanced && <th className="px-4 py-3">Bulk</th>}
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Missing</th>
                <th className="px-4 py-3">Expiring</th>
                <th className="px-4 py-3">QR</th>
                <th className="px-4 py-3">Last verification</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {enriched.map((employee) => (
                <tr key={employee.id} className="border-t border-slate-100">
                  {isAdvanced && (
                    <td className="px-4 py-3">
                      <input type="checkbox" name="employeeId" value={employee.id} className="rounded" />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{employee.firstName} {employee.lastName}</div>
                    <div className="text-xs text-slate-500">ID #{employee.employeeId}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <div className="font-semibold text-slate-900">{employee.role}</div>
                    <div className="text-xs text-slate-500">{employee.title}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${STATUS_STYLES[employee.complianceStatus]}`}>
                      {employee.complianceStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-rose-600">{employee.missingCerts}</td>
                  <td className="px-4 py-3 font-semibold text-amber-600">{employee.expiringCerts}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{employee.qrStatus}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatDate(employee.lastVerifiedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/compliance/employees/${employee.id}`} className="text-sm font-semibold text-indigo-600 hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {enriched.length === 0 && (
                <tr>
                  <td colSpan={isAdvanced ? 9 : 8} className="px-4 py-10 text-center text-sm text-slate-400">
                    No employees match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {isAdvanced && (
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 px-4 py-4 text-sm">
              <div className="text-slate-600">Enterprise bulk printing + exports enabled.</div>
              <div className="flex items-center gap-3">
                <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white">Bulk print packet</button>
                <a
                  href="/api/compliance/export?format=csv"
                  className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-700"
                >
                  CSV export
                </a>
                <a
                  href="/api/compliance/export?format=json"
                  className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-700"
                >
                  JSON export
                </a>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
