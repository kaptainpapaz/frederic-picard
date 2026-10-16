import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { logout } from '@/actions/auth'
import { BrandMark } from '@/components/site/Brand'
import { getSession } from '@/lib/auth-slot'
import { getContent } from '@/lib/content'
import { prisma } from '@/lib/db'

/** Toute page de ce groupe exige une session (règle E2 : l'identité vient du cookie). */
export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/admin/connexion')
  const [t, identity, newMessages] = await Promise.all([getTranslations('admin.nav'), getContent('identity'), prisma.message.count({ where: { status: 'NEW' } })])

  const items: { href: string; label: string; badge?: number }[] = [
    { href: '/admin', label: t('dashboard') },
    { href: '/admin/series', label: t('series') },
    { href: '/admin/tirages', label: t('prints') },
    { href: '/admin/pages/accueil', label: t('pages') },
    { href: '/admin/messages', label: t('messages'), badge: newMessages },
  ]
  const settings = [
    { href: '/admin/informations', label: t('infos') },
    { href: '/admin/compte', label: t('account') },
  ]

  return (
    <div className="grid min-h-[100dvh] md:grid-cols-[240px_1fr]">
      <aside className="flex flex-col gap-6 border-b border-border bg-background py-5 md:sticky md:top-0 md:h-[100dvh] md:border-r md:border-b-0">
        <div className="flex items-center gap-3 px-5">
          <BrandMark className="h-[22px] w-[38px] flex-none" />
          <span className="font-display text-[19px] leading-none">
            {identity.displayName}
            <small className="mt-1 block font-sans text-[9px] tracking-[0.24em] text-muted-foreground uppercase">{t('content')}</small>
          </span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 md:flex-col md:px-0">
          {items.map((i) => (
            <Link key={i.href} href={i.href} className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm whitespace-nowrap text-muted-foreground hover:text-foreground md:border-l-2 md:border-transparent md:px-5">
              {i.label}
              {i.badge ? <span className="bg-accent px-2 text-[11px] text-accent-foreground">{i.badge}</span> : null}
            </Link>
          ))}
          <span className="hidden px-5 pt-4 pb-1 text-[10px] tracking-[0.2em] text-muted-foreground uppercase md:block">{t('settings')}</span>
          {settings.map((i) => (
            <Link key={i.href} href={i.href} className="px-3 py-2.5 text-sm whitespace-nowrap text-muted-foreground hover:text-foreground md:px-5">
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto hidden gap-2 px-5 text-xs text-muted-foreground md:grid">
          <a href="/fr" target="_blank" rel="noreferrer" className="text-foreground">
            {t('viewSite')} →
          </a>
          <span>{t('connected', { email: session.user.email })}</span>
          <form action={logout}>
            <button type="submit" className="cta text-[10px]">
              {t('signOut')}
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 px-4 pt-6 pb-20 md:px-8 md:pt-8">
        <div className="mx-auto max-w-[1180px]">{children}</div>
      </main>
    </div>
  )
}
