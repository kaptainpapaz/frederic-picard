/**
 * Verrous pour les decisions concurrentes.
 *
 * Regle C1 : tout enchainement « je lis un etat, je decide, j'ecris » executable par
 * deux acteurs simultanement a besoin d'une garde. Sans elle, les deux passent le
 * controle prealable et la derniere ecriture gagne EN SILENCE.
 *
 * Origine : ostraveiro, regle apprise n°5, sur le changement de statut d'une reservation
 * et sur l'inscription a un evenement.
 *
 * Deux familles a reperer systematiquement :
 *   - les transitions de statut  -> verrou optimiste (on peut reessayer)
 *   - les capacites limitees     -> verrou de ligne (la ressource est finie)
 */

import { prisma } from './db'

/** Le client transactionnel, tel que Prisma 7 le fournit a $transaction. */
export type TransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

export class ConcurrentModificationError extends Error {
  constructor(readonly entity: string) {
    super(`Modification concurrente detectee sur ${entity}`)
    this.name = 'ConcurrentModificationError'
  }
}

/**
 * Verrou optimiste : l'etat lu sert de garde dans le WHERE.
 * Si une autre session a change l'etat entre la lecture et l'ecriture, le count vaut 0.
 *
 *   await optimisticTransition({
 *     entity: 'Reservation',
 *     apply: () => prisma.reservation.updateMany({
 *       where: { id, status: 'PENDING' },   // <- l'etat lu est la garde
 *       data:  { status: 'CONFIRMED' },
 *     }),
 *   })
 *
 * A utiliser des qu'une transition annule une autre transition possible.
 */
export async function optimisticTransition(params: {
  entity: string
  apply: () => Promise<{ count: number }>
}): Promise<void> {
  const { count } = await params.apply()
  if (count === 0) throw new ConcurrentModificationError(params.entity)
}

/**
 * Verrou de ligne : SELECT ... FOR UPDATE dans la transaction.
 * Les autres transactions attendent. A utiliser quand la decision engage une
 * ressource limitee et qu'un simple reessai ne suffit pas (surreservation).
 *
 *   await withRowLock('Event', eventId, async (tx) => {
 *     const taken = await sumCapacity(tx, eventId)
 *     if (taken + people > capacity) throw new CapacityExceededError()
 *     await tx.registration.create({ data: { eventId, people } })
 *   })
 *
 * Le verrou est pose sur la ligne parente (l'evenement), pas sur les inscriptions :
 * c'est la ressource finie qu'il faut serialiser.
 */
export async function withRowLock<T>(
  table: string,
  id: string,
  fn: (tx: TransactionClient) => Promise<T>,
): Promise<T> {
  assertSafeIdentifier(table)
  return prisma.$transaction(async (tx) => {
    await tx.$queryRawUnsafe(`SELECT id FROM "${table}" WHERE id = $1 FOR UPDATE`, id)
    return fn(tx)
  })
}

/** Le nom de table vient du code, jamais d'une entree utilisateur. Garde de securite. */
function assertSafeIdentifier(name: string): void {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`Identifiant de table invalide : ${name}`)
  }
}
