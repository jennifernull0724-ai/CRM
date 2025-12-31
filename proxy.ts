import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import {
  PLAN_TIERS,
  RESTRICTION_LABELS,
  type PlanKey,
  type PlanRestrictionKey,
} from '@/lib/billing/planTiers'
import { resolveRoleDestination, isUserRole, isOwnerOrAdmin } from '@/lib/auth/roleDestinations'

const PUBLIC_PATHS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/browserconfig.xml',

  '/login',
  '/signup',
  '/forgot-password',
  '/verify',

  '/pricing',
  '/request-demo',
  '/contact-sales',
  '/privacy',
  '/terms',
  '/security',
  '/legal',
  '/support',

  '/api/auth/signup',
  '/api/auth/signin',
  '/api/auth/callback',
  '/api/auth/session',
  '/api/auth/csrf',
  '/api/auth/providers',
  '/api/forms',
  '/api/stripe/checkout',
]

const PLAN_BYPASS_PATHS = ['/upgrade', '/upgrade/success', '/upgrade/cancel']
const API_BYPASS_PATTERNS = [/^\/api\/auth\//, /^\/api\/stripe\//]
const STRIPE_RETURN_PATHS = ['/checkout/success', '/checkout/cancel']

const RESTRICTION_ROUTE_MAP: Record<PlanRestrictionKey, RegExp[]> = {
  no_user_invites: [/^\/settings\/users/, /^\/api\/users/, /^\/api\/invitations/],
  no_compliance: [/^\/compliance/, /^\/api\/compliance/],
  no_qr: [/qr/, /certification/],
  no_bulk_import: [/import/, /^\/api\/bulk-import/, /^\/api\/import/],
  no_approvals: [/approval/, /^\/api\/approvals/],
  no_analytics: [/analytics/, /^\/dashboard\/analytics/, /^\/api\/analytics/],
  no_exports: [/export/, /^\/api\/export/],
  no_templates: [/templates/, /^\/api\/templates/],
}

const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']

// Static file extensions that should never be intercepted
const STATIC_EXTENSIONS = [
  '.ico', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
  '.css', '.js', '.map', '.json', '.xml', '.txt'
]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path))
}

function isStaticAsset(pathname: string): boolean {
  return STATIC_EXTENSIONS.some((ext) => pathname.endsWith(ext))
}


function shouldBypassPlan(pathname: string): boolean {
  return (
    PLAN_BYPASS_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ||
    STRIPE_RETURN_PATHS.some((path) => pathname.startsWith(path))
  )
}

function matchesApiBypass(pathname: string): boolean {
  return API_BYPASS_PATTERNS.some((regex) => regex.test(pathname))
}

function findRestrictionViolation(
  planKey: PlanKey,
  pathname: string
): PlanRestrictionKey | null {
  const plan = PLAN_TIERS[planKey]

  for (const restriction of plan.restrictions) {
    const matchers = RESTRICTION_ROUTE_MAP[restriction]
    if (matchers && matchers.some((regex) => regex.test(pathname))) {
      return restriction
    }
  }

  return null
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 🔒 ABSOLUTE STATIC FILE BYPASS - MUST BE FIRST
  // These files must NEVER hit auth middleware
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/public/') ||
    pathname.endsWith('.json') ||
    pathname.endsWith('.xml') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.webp') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.map') ||
    pathname === '/site.manifest.json' ||
    pathname === '/manifest.json' ||
    pathname === '/browserconfig.xml' ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  ) {
    return NextResponse.next()
  }

  const isApiRoute = pathname.startsWith('/api')
  const method = request.method.toUpperCase()
  const isWrite = WRITE_METHODS.includes(method)

  // Allow all public paths to bypass authentication
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

  if (!token) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const userRole = (token.role as string | undefined) ?? undefined

  if (pathname === '/dashboard') {
    return NextResponse.redirect(new URL('/app', request.url))
  }


  if (pathname.startsWith('/dashboard/estimator')) {
    return NextResponse.redirect(new URL('/estimating', request.url))
  }

  if (pathname.startsWith('/crm')) {
    if (!isUserRole(userRole)) {
      return NextResponse.redirect(new URL(resolveRoleDestination(userRole), request.url))
    }
  }

  if (pathname.startsWith('/dashboard')) {
    if (!isOwnerOrAdmin(userRole)) {
      return NextResponse.redirect(new URL(resolveRoleDestination(userRole), request.url))
    }
  }

  if (matchesApiBypass(pathname) || shouldBypassPlan(pathname)) {
    return NextResponse.next()
  }

  const planKey = (token.planKey as PlanKey) ?? 'starter'
  const plan = PLAN_TIERS[planKey]
  const starterExpiresAt = token.starterExpiresAt ? new Date(token.starterExpiresAt as string) : null
  const starterExpired =
    planKey === 'starter' && starterExpiresAt ? starterExpiresAt.getTime() < Date.now() : false

  if (starterExpired) {
    if (isApiRoute && isWrite) {
      return NextResponse.json(
        { error: 'Starter access expired. Upgrade to continue writing data.' },
        { status: 403 }
      )
    }

    if (!pathname.startsWith('/upgrade')) {
      const upgradeUrl = new URL('/upgrade', request.url)
      upgradeUrl.searchParams.set('reason', 'starter-expired')
      return NextResponse.redirect(upgradeUrl)
    }
  }

  const restriction = findRestrictionViolation(planKey, pathname)

  if (restriction) {
    const message = `${plan.name} plan restriction: ${RESTRICTION_LABELS[restriction]}`

    if (isApiRoute) {
      if (!isWrite) {
        return NextResponse.json({ error: message }, { status: 403 })
      }
      return NextResponse.json({ error: message }, { status: 403 })
    }

    const upgradeUrl = new URL('/upgrade', request.url)
    upgradeUrl.searchParams.set('feature', restriction)
    return NextResponse.redirect(upgradeUrl)
  }

  return NextResponse.next()
}

export const middleware = proxy

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, manifest.json, site.manifest.json, robots.txt, sitemap.xml, browserconfig.xml
     * - public folder files
     * - files with extensions: .ico, .png, .jpg, .jpeg, .gif, .svg, .webp, .css, .js, .map, .json, .xml, .txt
     */
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|site\\.manifest\\.json|robots\\.txt|sitemap\\.xml|browserconfig\\.xml|.*\\.(?:ico|png|jpg|jpeg|gif|svg|webp|css|js|map|json|xml|txt)$).*)',
  ],
}
