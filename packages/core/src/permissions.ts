/**
 * Framework-agnostic permission checking with wildcard support.
 * Used by @kaappu/react, @kaappu/next, @kaappu/angular, @kaappu/vue, etc.
 */

/**
 * Check if a user's permissions satisfy a required permission.
 *
 * Supports:
 *   - Exact match: 'users:read' satisfies 'users:read'
 *   - Super wildcard: '*' satisfies any permission
 *   - Resource wildcard: 'users:*' satisfies 'users:read', 'users:delete', etc.
 *
 * @param userPermissions - Array of permission strings the user has
 * @param required - The permission string required
 * @returns true if the user has the required permission
 */
export function checkPermission(userPermissions: string[] | undefined | null, required: string): boolean {
  if (!required) return true
  if (!userPermissions || userPermissions.length === 0) return false
  const [requiredResource] = required.split(':')
  return userPermissions.some(p =>
    p === '*' || p === required || p === `${requiredResource}:*`
  )
}

/**
 * Check if a user has ALL of the required permissions.
 */
export function checkAllPermissions(userPermissions: string[] | undefined | null, required: string[]): boolean {
  return required.every(perm => checkPermission(userPermissions, perm))
}

/**
 * Check if a user has ANY of the required permissions.
 */
export function checkAnyPermission(userPermissions: string[] | undefined | null, required: string[]): boolean {
  return required.some(perm => checkPermission(userPermissions, perm))
}

/** Type guard — checks if a string matches the resource:action pattern */
export function isPermission(val: string): boolean {
  return val === '*' || /^[a-z_]+:[a-z_*]+$/.test(val)
}
