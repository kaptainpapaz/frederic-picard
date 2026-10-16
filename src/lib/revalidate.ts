/**
 * Invalidation du cache des pages publiques (ISR, règle B1).
 *
 * Règle F5 : la liste des mutations qui invalident est exhaustive et vit ici.
 * Toute action d'administration qui touche une série, une photo, un tirage ou un
 * contenu de page appelle revalidatePublic(). Le site est petit : on invalide tout
 * le segment localisé plutôt que de tenir une carte fine des dépendances.
 *
 * Piège Next : pour un segment dynamique, revalidatePath attend le MOTIF de route
 * ('/[locale]'), pas une valeur ('/fr'). Constaté le 2026-10-16 : avec '/fr', la boutique
 * restait sur sa version en cache après l'ajout d'un tirage.
 */
import { revalidatePath } from 'next/cache'

export function revalidatePublic(): void {
  revalidatePath('/[locale]', 'layout')
}
