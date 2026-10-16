import { NextIntlClientProvider } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { fontClassName } from '@/lib/fonts'
import '../globals.css'

/**
 * Administration : hors du segment [locale], pas de préfixe de langue (exclusion
 * documentée dans src/proxy.ts). Rendu dynamique autorisé : ce n'est pas le site public.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin')
  return { title: t('title'), robots: { index: false, follow: false } }
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${fontClassName} bg-muted text-foreground`}>
      <body className="min-h-[100dvh] bg-muted text-foreground">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  )
}
