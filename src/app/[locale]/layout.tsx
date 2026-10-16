import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { routing } from '@/i18n/routing'
import { fontClassName } from '@/lib/fonts'
import '../globals.css'

/**
 * Règle B1 : generateStaticParams n'interroge JAMAIS la base, et ici il ne pré-génère
 * RIEN. Toutes les pages publiques lisent la base (séries, tirages, textes) : elles se
 * construisent à la première visite puis restent en cache (ISR, `revalidate` sur chaque
 * page, invalidé par src/lib/revalidate.ts à chaque modification dans l'admin).
 * Retourner [] et non la liste des locales : sinon `/fr` serait rendu au build, sans base.
 */
export function generateStaticParams(): { locale: string }[] {
  return []
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'app' })
  return {
    title: { default: t('title'), template: `%s · ${t('title')}` },
    description: t('description'),
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  }
}

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  return (
    // Règle H1 : l'élément qui ouvre la portée de thème porte aussi sa classe de fond.
    <html lang={locale} className={`${fontClassName} bg-background text-foreground`}>
      <body className="min-h-[100dvh] bg-background text-foreground">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  )
}
