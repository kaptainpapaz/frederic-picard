import { defineRouting } from 'next-intl/routing'

/**
 * Arbitrage n°8 : i18n DANS LE SOCLE, des le premier ecran.
 *
 * Raison : c'est le seul arbitrage ou la decision tardive coute un refactor complet.
 * Le point de fuite habituel est la validation Zod, parce qu'elle vit cote serveur avec
 * le reste de la logique (regle H3). Rattraper l'i18n sur un projet ecrit en francais en
 * dur signifie reprendre tous les schemas de validation.
 *
 * Un projet mono-langue laisse `locales` a ['fr'] et paie seulement le passage par les
 * dictionnaires. Ajouter une langue devient alors un fichier JSON, pas un chantier.
 */
export const routing = defineRouting({
  locales: ['fr'],
  defaultLocale: 'fr',
  // Prefixe systematique. Changer ce reglage a un cout SEO : c'est un arbitrage ouvert
  // au sens de la regle K1, a documenter dans le CLAUDE.md du projet s'il est modifie.
  localePrefix: 'always',
})

export type Locale = (typeof routing.locales)[number]
