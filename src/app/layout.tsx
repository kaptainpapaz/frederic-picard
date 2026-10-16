import type { ReactNode } from 'react'

/**
 * Layout racine minimal. Le rendu réel vit dans src/app/[locale]/layout.tsx (site)
 * et src/app/admin/layout.tsx (administration).
 *
 * Règle B3 : ne JAMAIS appeler headers(), cookies() ou draftMode() ici.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children
}
