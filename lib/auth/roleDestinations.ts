const ROLE_DESTINATIONS: Record<string, string> = {
  owner: '/dashboard/owner',
  admin: '/dashboard/admin',
  user: '/dashboard/user',
  estimator: '/dashboard/estimator',
  dispatch: '/dispatch',
}

export function resolveRoleDestination(role?: string | null): string {
  if (!role) {
    return '/app'
  }

  const normalizedRole = role.toLowerCase()
  return ROLE_DESTINATIONS[normalizedRole] ?? '/app'
}

export function isUserRole(role?: string | null): boolean {
  return role?.toLowerCase() === 'user'
}

export function isOwnerOrAdmin(role?: string | null): boolean {
  const normalizedRole = role?.toLowerCase()
  return normalizedRole === 'owner' || normalizedRole === 'admin'
}

export { ROLE_DESTINATIONS }
