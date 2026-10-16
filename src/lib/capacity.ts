/**
 * Jauges de capacite.
 *
 * Regle C2 : on compte les personnes, pas les lignes. Une inscription pour quatre
 * occupe quatre places. Toute jauge additionne la quantite portee par chaque
 * enregistrement, jamais count().
 *
 * Et le calcul est IDENTIQUE a l'affichage et dans la decision. Sinon l'ecran affiche
 * « complet » quand la logique accepte encore, ou l'inverse. C'est pour cela qu'il vit
 * ici et nulle part ailleurs : la vue importe cette fonction, elle ne la reecrit pas.
 *
 * Origine : ostraveiro, regle apprise n°6.
 */

export class CapacityExceededError extends Error {
  constructor(
    readonly requested: number,
    readonly remaining: number,
  ) {
    super(`Capacite depassee : ${requested} demande(s), ${remaining} restante(s)`)
    this.name = 'CapacityExceededError'
  }
}

export type Gauge = {
  capacity: number
  taken: number
  remaining: number
  isFull: boolean
  /** Nombre d'enregistrements. Informatif uniquement, ne sert JAMAIS a decider. */
  entries: number
}

/** Additionne la quantite portee par chaque enregistrement. */
export function computeGauge<T>(
  entries: readonly T[],
  quantityOf: (entry: T) => number,
  capacity: number,
): Gauge {
  const taken = entries.reduce((sum, e) => sum + quantityOf(e), 0)
  const remaining = Math.max(0, capacity - taken)
  return { capacity, taken, remaining, isFull: remaining === 0, entries: entries.length }
}

/**
 * Decide si une demande tient. A appeler DANS le verrou de ligne, jamais avant.
 * Voir locks.ts, withRowLock.
 */
export function assertFits(gauge: Gauge, requested: number): void {
  if (requested > gauge.remaining) {
    throw new CapacityExceededError(requested, gauge.remaining)
  }
}

/** Bascule en liste d'attente : meme calcul que l'affichage, par construction. */
export function shouldWaitlist(gauge: Gauge, requested: number): boolean {
  return requested > gauge.remaining
}
