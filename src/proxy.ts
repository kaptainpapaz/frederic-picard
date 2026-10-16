import createMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'

/**
 * Next.js 16 : ce fichier s'appelle proxy.ts, plus middleware.ts. Regle A1.
 *
 * C'est le SEUL endroit ou il est permis de lire un cookie ou un en-tete pour determiner
 * la langue. Regle B4 : partout ailleurs la locale circule par les props, depuis
 * params.locale. Lire cookies() ou headers() dans un composant serveur d'un segment
 * public fait basculer TOUT le segment en rendu dynamique, sans la moindre erreur de
 * build (regle B3, un not-found.tsx a suffi sur ostraveiro).
 */
export default createMiddleware(routing)

export const config = {
  /**
   * Regle E5 : toute exclusion se documente avec sa raison.
   *   _next, _vercel      internes au framework
   *   fichiers a extension statiques servis tels quels
   *   /api                routes d'API, hors routage i18n par URL
   *   /admin              back-office, trilingue par preference utilisateur et non par
   *                       URL, donc jamais de prefixe de locale
   *   /uploads            servi par le serveur web, hors perimetre de Next (regle B6)
   */
  matcher: '/((?!api|admin|uploads|_next|_vercel|.*\\..*).*)',
}
