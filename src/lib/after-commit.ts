/**
 * Effets de bord externes, apres commit.
 *
 * Regle F1 : l'envoi d'email n'est jamais dans la meme transaction qu'un changement
 * d'etat. Un SMTP indisponible ne doit pas annuler une decision prise par l'equipe.
 *
 * Ordre impose : on valide, on committe, PUIS on declenche l'effet, PUIS on journalise
 * son issue. Toute exception survenant apres le commit se journalise et ne remonte
 * JAMAIS comme un echec de l'action : la remonter ferait croire a l'utilisateur que son
 * action n'a pas eu lieu alors qu'elle est enregistree, et l'inciterait a la rejouer.
 *
 * Vaut pour tout appel externe post-commit : email, webhook, notification push, paiement.
 *
 * Origine : ostraveiro, regle apprise n°4.
 */

export type SideEffect = {
  /** Identifie l'effet dans le journal. Ex : 'email:reservation-confirmee'. */
  name: string
  run: () => Promise<void>
}

export type SideEffectOutcome = {
  name: string
  status: 'done' | 'failed'
  error?: unknown
  at: Date
}

type Journal = (outcome: SideEffectOutcome) => Promise<void> | void

let journal: Journal = (outcome) => {
  // Remplacer par l'ecriture dans la table de journalisation du projet.
  // Regle C6 : cette table nait avec sa politique de retention.
  const level = outcome.status === 'failed' ? 'error' : 'info'
  console[level === 'error' ? 'error' : 'info'](
    `[side-effect] ${outcome.name} ${outcome.status}`,
    outcome.error ?? '',
  )
}

export function setSideEffectJournal(fn: Journal): void {
  journal = fn
}

/**
 * Execute la transaction, PUIS les effets de bord.
 *
 *   const result = await commitThen(
 *     () => prisma.reservation.update({ where: { id }, data: { status: 'CONFIRMED' } }),
 *     (reservation) => [
 *       { name: 'email:confirmation', run: () => sendTransition('reservation.confirmed', reservation) },
 *     ],
 *   )
 *
 * Si un effet echoue, `result` est quand meme retourne : la decision est prise.
 * L'echec est journalise, c'est un incident a rattraper, pas une decision a defaire.
 */
export async function commitThen<T>(
  commit: () => Promise<T>,
  effectsOf: (committed: T) => SideEffect[],
): Promise<T> {
  const committed = await commit()

  const effects = effectsOf(committed)
  for (const effect of effects) {
    try {
      await effect.run()
      await journal({ name: effect.name, status: 'done', at: new Date() })
    } catch (error) {
      // Volontairement avale. Voir l'en-tete de ce fichier.
      await journal({ name: effect.name, status: 'failed', error, at: new Date() })
    }
  }

  return committed
}
