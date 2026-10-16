#!/usr/bin/env node
/**
 * Controle automatique du tableau des routes.
 *
 * Regle B3 : une seule API dynamique fait basculer tout un segment en rendu dynamique,
 * SANS LA MOINDRE ERREUR DE BUILD. Un not-found.tsx a suffi sur ostraveiro. Le tableau
 * des routes en fin de build est le seul indicateur de la strategie reellement obtenue,
 * et personne ne pense a le lire.
 *
 * Ce script le lit a la place de l'humain, apres `next build`, et sort en erreur si une
 * route publique est passee en dynamique.
 *
 * Usage : node scripts/check-render-strategy.mjs
 * Integre dans `npm run verify`.
 */

import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'

const MANIFEST = path.join(process.cwd(), '.next', 'prerender-manifest.json')
const APP_PATHS = path.join(process.cwd(), '.next', 'app-path-routes-manifest.json')

/**
 * Segments dont les pages DOIVENT rester statiques ou ISR.
 * A completer projet par projet. Le back-office, lui, a le droit d'etre dynamique.
 */
const PUBLIC_SEGMENTS = ['/[locale]']
const ALLOWED_DYNAMIC = [
  // Ajouter ici les routes publiques volontairement dynamiques, AVEC leur raison.
  // Ex : '/[locale]/recherche',  // filtres lus dans searchParams, non cacheable
]

function fail(message) {
  console.error(`\n[check-render-strategy] ${message}\n`)
  process.exit(1)
}

if (!existsSync(APP_PATHS)) {
  fail(`Manifeste introuvable (${APP_PATHS}). Lancer \`next build\` d'abord.`)
}

const appPaths = JSON.parse(readFileSync(APP_PATHS, 'utf8'))
const prerender = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : { routes: {}, dynamicRoutes: {} }

const prerendered = new Set([
  ...Object.keys(prerender.routes ?? {}),
  ...Object.keys(prerender.dynamicRoutes ?? {}),
])

const publicPages = Object.keys(appPaths).filter(
  (route) =>
    PUBLIC_SEGMENTS.some((segment) => route.startsWith(segment)) && route.endsWith('/page'),
)

if (publicPages.length === 0) {
  fail('Aucune page publique trouvee. Verifier PUBLIC_SEGMENTS dans ce script.')
}

const dynamic = []
for (const appPath of publicPages) {
  const route = appPaths[appPath]
  if (ALLOWED_DYNAMIC.includes(route)) continue
  // Une page prerendue apparait dans le manifeste. Une page dynamique n'y est pas.
  const isPrerendered = [...prerendered].some((r) => r === route || r.startsWith(`${route}/`))
  if (!isPrerendered) dynamic.push(route)
}

if (dynamic.length > 0) {
  fail(
    [
      `${dynamic.length} page(s) publique(s) en rendu DYNAMIQUE :`,
      ...dynamic.map((r) => `  ${r}`),
      '',
      'Cause la plus probable : un appel a headers(), cookies() ou draftMode() dans un',
      'fichier du segment, y compris un layout, un not-found.tsx ou un error.tsx.',
      'La locale doit circuler par les props depuis params.locale (regle B4).',
      '',
      'Si le dynamisme est volontaire, ajouter la route a ALLOWED_DYNAMIC dans ce',
      'script AVEC sa raison en commentaire.',
    ].join('\n'),
  )
}

console.log(
  `[check-render-strategy] ${publicPages.length} page(s) publique(s), toutes statiques ou ISR.`,
)
