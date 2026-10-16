/**
 * Contrat de retour unique des Server Actions.
 *
 * Arbitrage n°5 du document ARBITRAGES : trois organisations coexistaient dans le parc
 * (src/actions par domaine, src/lib/*Actions a plat, app/api seul) et un seul projet
 * declarait un contrat d'erreur. Celui-ci est le contrat retenu.
 *
 * Regle : une action ne jette jamais vers le client. Elle retourne toujours ce type.
 * Une exception qui remonte produit une page d'erreur au lieu d'un message utilisable.
 */

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: ActionError }

export type ActionError = {
  /** Cle de traduction, jamais un texte en dur. Regle H3. */
  key: string
  /** Erreurs par champ, cles de traduction egalement. */
  fields?: Record<string, string>
  /** Contexte technique, journalise mais jamais affiche. */
  cause?: unknown
}

export function ok(): ActionResult<void>
export function ok<T>(data: T): ActionResult<T>
export function ok<T>(data?: T): ActionResult<T | void> {
  return { success: true, data: data as T }
}

export function err(
  key: string,
  options?: { fields?: Record<string, string>; cause?: unknown },
): ActionResult<never> {
  return { success: false, error: { key, ...options } }
}

/**
 * Erreurs communes. Les cles existent dans messages/*.json.
 * Ajouter une cle ici oblige a l'ajouter dans TOUS les dictionnaires (regle H3).
 */
export const ERRORS = {
  unauthorized: 'errors.unauthorized',
  forbidden: 'errors.forbidden',
  notFound: 'errors.notFound',
  validation: 'errors.validation',
  conflict: 'errors.conflict',
  capacityExceeded: 'errors.capacityExceeded',
  unexpected: 'errors.unexpected',
} as const
