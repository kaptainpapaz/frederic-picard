import { getSession, type Session } from '@/lib/auth-slot'
import { requirePermission, type PermissionKey } from '@/lib/rbac'

/**
 * Garde unique des actions d'administration (règles E2, E5). Lève UNAUTHORIZED ou
 * FORBIDDEN ; les actions convertissent en ActionResult via guarded().
 */
export async function requireAdmin(permission: PermissionKey = 'content.page.write'): Promise<Session> {
  const session = await getSession()
  requirePermission(session, permission)
  return session as Session
}
