import { ERRORS, err, type ActionResult } from '@/lib/result'

/**
 * Enveloppe commune des Server Actions : une action ne jette jamais vers le client
 * (contrat de src/lib/result.ts). UNAUTHORIZED et FORBIDDEN viennent de rbac.ts ;
 * les exceptions de redirect() de Next portent un `digest` et doivent remonter.
 */
export async function guard<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn()
  } catch (error) {
    if (typeof error === 'object' && error && 'digest' in error) throw error
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return err(ERRORS.unauthorized)
    if (error instanceof Error && error.message === 'FORBIDDEN') return err(ERRORS.forbidden)
    console.error(error)
    return err(ERRORS.unexpected, { cause: error })
  }
}

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}
