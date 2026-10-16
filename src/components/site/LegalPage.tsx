import { getTranslations, setRequestLocale } from 'next-intl/server'
import { SiteShell } from '@/components/site/SiteShell'
import { getContent, type LegalContent } from '@/lib/content'

/** Page texte éditable depuis l'admin (mentions légales, CGV, confidentialité). */
export async function LegalPage({ locale, field }: { locale: string; field: keyof LegalContent }) {
  setRequestLocale(locale)
  const t = await getTranslations('legal')
  const legal = await getContent('legal')
  const text = legal[field]
  return (
    <SiteShell>
      <section className="mx-auto max-w-[760px] px-6 pt-14 pb-24">
        <h1 className="font-display mb-8 text-[clamp(36px,4.5vw,60px)] leading-none">{t(field)}</h1>
        {text ? (
          text.split(/\n\n+/).map((p, i) => (
            <p key={i} className="mb-4 whitespace-pre-line text-muted-foreground">
              {p}
            </p>
          ))
        ) : (
          <p className="text-muted-foreground">{t('empty')}</p>
        )}
      </section>
    </SiteShell>
  )
}
