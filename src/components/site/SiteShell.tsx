import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'
import { Link } from '@/i18n/navigation'
import { SiteHeader } from '@/components/site/SiteHeader'
import { getContent } from '@/lib/content'

/**
 * Enveloppe commune des pages publiques : en-tête, pied de page, coordonnées.
 * `overHero` : l'accueil pose son hero sous l'en-tête transparent ; les autres pages
 * réservent la hauteur de l'en-tête.
 */
export async function SiteShell({ children, overHero = false }: { children: ReactNode; overHero?: boolean }) {
  const [t, identity] = await Promise.all([getTranslations('nav'), getContent('identity')])
  const items = [
    { href: '/series' as const, label: t('series') },
    { href: '/tirages' as const, label: t('prints') },
    { href: '/contact' as const, label: t('contact') },
  ]
  return (
    <>
      <SiteHeader name={identity.displayName} tagline={identity.tagline} items={items} overHero={overHero} />
      <main className={overHero ? '' : 'pt-[78px] md:pt-[78px]'}>{children}</main>
      <footer className="mx-auto flex max-w-[1360px] flex-wrap justify-between gap-3 border-t border-border px-6 py-7 text-xs text-muted-foreground">
        <span>© {identity.displayName}</span>
        <span className="flex gap-4">
          <Link href="/mentions-legales" className="hover:text-foreground">
            {t('legal')}
          </Link>
          <Link href="/cgv" className="hover:text-foreground">
            {t('terms')}
          </Link>
          <Link href="/confidentialite" className="hover:text-foreground">
            {t('privacy')}
          </Link>
        </span>
        <span>
          {identity.email}
          {identity.instagram ? ` · ${identity.instagram}` : ''}
        </span>
      </footer>
    </>
  )
}
