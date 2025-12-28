import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

const publicPaths = ['/', '/login', '/signup', '/pricing', '/legal', '/verify']
const authPaths = ['/login', '/signup']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Allow public paths
  if (publicPaths.some(path => pathname.startsWith(path))) {
    // Redirect authenticated users away from auth pages
    if (authPaths.some(path => pathname.startsWith(path))) {
      const token = await getToken({
        req: request,
        secret: process.env.AUTH_SECRET,
      })
      
      if (token) {
        return NextResponse.redirect(new URL('/dashboard/user', request.url))
      }
    }
    
    return NextResponse.next()
  }
  
  // Check authentication
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  })
  
  if (!token) {
    const url = new URL('/login', request.url)
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }
  
  // Role-based access control
  const userRole = token.role as string
  
  // Compliance module - Owner/Admin only
  if (pathname.startsWith('/compliance')) {
    if (!['admin', 'owner'].includes(userRole)) {
      return NextResponse.redirect(new URL('/dashboard/user', request.url))
    }
  }
  
  // Settings - Role-aware (basic access for all, advanced for admin/owner)
  if (pathname.startsWith('/settings/users') || pathname.startsWith('/settings/billing')) {
    if (!['admin', 'owner'].includes(userRole)) {
      return NextResponse.redirect(new URL('/settings', request.url))
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)',
  ],
}
