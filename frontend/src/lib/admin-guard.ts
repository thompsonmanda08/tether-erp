import { verifySession } from './auth'
import { redirect } from 'next/navigation'

/** Roles that may access the admin console. */
export const ADMIN_ROLES = ['admin'] as const

/**
 * Verify that the user has admin privileges before rendering admin pages.
 * Redirects to /login if not authenticated, /access-denied if not an admin role.
 */
export async function requireAdminRole() {
  const { session, isAuthenticated } = await verifySession()

  if (!isAuthenticated || !session?.user) {
    redirect('/login')
  }

  if (!(ADMIN_ROLES as readonly string[]).includes(session.user.role || '')) {
    redirect('/access-denied')
  }

  return {
    userId: session.user.id,
    userRole: session.user.role,
    userName: session.user.name || session.user.email,
  }
}

/**
 * Verify that the user has a specific admin permission.
 * admin and super_admin bypass this check — they have full access.
 */
export async function requireAdminPermission(requiredPermission: string) {
  const { session, isAuthenticated } = await verifySession()

  if (!isAuthenticated || !session?.user) {
    redirect('/login')
  }

  // admin has full access — no per-permission check needed
  if (session.user.role === 'admin') {
    return
  }

  const hasPermission = session.user.permissions?.includes(requiredPermission)

  if (!hasPermission) {
    redirect('/access-denied')
  }
}

/**
 * Verify that the user is authenticated (used for private routes).
 */
export async function requireAuthentication() {
  const { session, isAuthenticated } = await verifySession()

  if (!isAuthenticated || !session?.user) {
    redirect('/login')
  }

  return {
    userId: session.user.id,
    userRole: session.user.role,
  }
}
