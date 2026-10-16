/**
 * Permissions.
 *
 * Arbitrage n°4 : le modele par permissions couvre le cas des roles fixes, l'inverse
 * n'est pas vrai. C'est donc le seul modele du starter ; un preset pre-remplit les roles.
 *
 * Deux regles apprises couteuses sont corrigees PAR CONSTRUCTION ici :
 *
 *   E3 — Sur ostraveiro, une permission nouvelle demandait trois gestes separes
 *        (lib/rbac.ts, prisma db seed, lib/permissions-labels.ts + permission-domains.ts).
 *        Etape 2 oubliee : le bouton ne s'affiche pour personne.
 *        Etape 3 oubliee : la permission protege mais reste inattribuable a l'ecran.
 *        Ici, la declaration ci-dessous porte le libelle, le domaine et la cle de
 *        traduction. UN SEUL point de declaration. Le seed lit ce fichier.
 *
 *   E4 — `sync-rbac --apply` a efface le 11/08/2026 des droits accordes a l'ecran.
 *        La source d'autorite est declaree explicitement plus bas, et l'outil de
 *        reconciliation ne s'execute jamais dans une sequence automatique.
 */

/** SOURCE D'AUTORITE. Regle E4. A choisir a l'ouverture du projet, et a ne plus changer. */
export const PERMISSION_AUTHORITY: 'code' | 'database' = 'code'

export type PermissionDomain = 'content' | 'users' | 'settings' | 'system'

export type PermissionDefinition = {
  /** Format impose : domaine.ressource.action */
  key: string
  domain: PermissionDomain
  /** Cle de traduction du libelle. Regle H3, y compris ici. */
  labelKey: string
}

/**
 * Le catalogue. Ajouter une permission = ajouter UNE ligne ici, puis `npm run db:seed`.
 * Le seed est idempotent (regle C4), il peut etre relance en production.
 */
export const PERMISSIONS = [
  { key: 'content.page.read', domain: 'content', labelKey: 'permissions.content.page.read' },
  { key: 'content.page.write', domain: 'content', labelKey: 'permissions.content.page.write' },
  { key: 'content.page.publish', domain: 'content', labelKey: 'permissions.content.page.publish' },
  { key: 'users.account.read', domain: 'users', labelKey: 'permissions.users.account.read' },
  { key: 'users.account.write', domain: 'users', labelKey: 'permissions.users.account.write' },
  { key: 'settings.site.write', domain: 'settings', labelKey: 'permissions.settings.site.write' },
  { key: 'system.audit.read', domain: 'system', labelKey: 'permissions.system.audit.read' },
] as const satisfies readonly PermissionDefinition[]

export type PermissionKey = (typeof PERMISSIONS)[number]['key']

/**
 * Roles par defaut. Un preset « roles fixes » se contente de ne jamais editer ces listes.
 *
 * Noter le cas ostraveiro : `content.page.publish` est volontairement absente de
 * `editor`. Publier n'est pas ecrire. Ce genre de distinction se decide ici, pas a l'ecran.
 */
export const DEFAULT_ROLES: Record<string, readonly PermissionKey[]> = {
  admin: PERMISSIONS.map((p) => p.key),
  editor: ['content.page.read', 'content.page.write', 'users.account.read'],
  viewer: ['content.page.read'],
}

/* ------------------------------------------------------------------ */
/* Garde unique                                                        */
/* ------------------------------------------------------------------ */

export function can(
  session: { user: { permissions: readonly string[] } } | null,
  permission: PermissionKey,
): boolean {
  return session?.user.permissions.includes(permission) ?? false
}

/**
 * Garde serveur unique. Regle E2 et E5 : toute route protegee passe par ici, et toute
 * exclusion se documente avec sa raison.
 */
export function requirePermission(
  session: { user: { permissions: readonly string[] } } | null,
  permission: PermissionKey,
): void {
  if (!session) throw new Error('UNAUTHORIZED')
  if (!can(session, permission)) throw new Error('FORBIDDEN')
}
