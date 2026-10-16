/**
 * Polices auto-hébergées (fichiers dans src/fonts/, variables font latin).
 * Règle B1 : le build ne parle à aucun service extérieur, donc pas de next/font/google.
 */
import localFont from 'next/font/local'

export const cormorant = localFont({
  src: [
    { path: '../fonts/CormorantGaramond.woff2', weight: '400 500', style: 'normal' },
    { path: '../fonts/CormorantGaramond-Italic.woff2', weight: '400', style: 'italic' },
  ],
  variable: '--font-cormorant',
  display: 'swap',
})

export const figtree = localFont({
  src: [{ path: '../fonts/Figtree.woff2', weight: '300 600', style: 'normal' }],
  variable: '--font-figtree',
  display: 'swap',
})

export const fontClassName = `${cormorant.variable} ${figtree.variable}`
