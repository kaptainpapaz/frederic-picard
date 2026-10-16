import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

/** Règle B3 : aucune API dynamique ici (pas de headers(), cookies()). */
export default async function NotFound() {
  const t = await getTranslations('notFound')
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-[760px] flex-col justify-center gap-4 px-6">
      <h1 className="font-display text-5xl">{t('title')}</h1>
      <p className="text-muted-foreground">{t('text')}</p>
      <Link href="/" className="cta self-start">
        {t('home')}
      </Link>
    </main>
  )
}
