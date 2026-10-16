import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { Picture } from '@/components/site/Picture'
import { SiteShell } from '@/components/site/SiteShell'
import { serieBySlug } from '@/lib/queries'

export const revalidate = 3600

/** Règle B1 : rien n'est pré-généré au build ; chaque série se construit à la première visite (ISR). */
export function generateStaticParams(): { slug: string }[] {
  return []
}

type Props = { params: Promise<{ locale: string; slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const serie = await serieBySlug(slug)
  return serie ? { title: serie.title, description: serie.intro || undefined } : {}
}

export default async function SeriePage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const t = await getTranslations('serie')
  const serie = await serieBySlug(slug)
  if (!serie) notFound()
  const hasPrints = serie.photos.some((p) => p.tirages.length > 0)

  return (
    <SiteShell>
      <section className="mx-auto grid max-w-[1360px] items-end gap-6 px-6 pt-12 pb-10 md:grid-cols-[2fr_1fr] md:gap-10">
        <div>
          <Link href="/series" className="mb-4 inline-block text-xs tracking-[0.14em] text-muted-foreground uppercase">
            ← {t('back')}
          </Link>
          <div className="eyebrow">{t('meta', { year: serie.year ?? '', count: serie.photos.length, status: serie.status })}</div>
          <h1 className="font-display mt-2 text-[clamp(44px,6vw,92px)] leading-[0.95]">{serie.title}</h1>
        </div>
        <div>
          {serie.intro ? <p className="mb-4 max-w-[42ch] text-muted-foreground">{serie.intro}</p> : null}
          {hasPrints ? (
            <Link href="/tirages" className="cta">
              {t('printsOfSerie')}
            </Link>
          ) : null}
        </div>
      </section>

      <section className="mx-auto grid max-w-[1360px] gap-x-8 gap-y-12 px-6 pt-2 pb-24 md:grid-cols-2">
        {serie.photos.map((p) => (
          <figure key={p.id} className={`m-0 ${p.wide ? 'md:col-span-2' : ''}`}>
            <Picture fileKey={p.fileKey} alt={p.title} sizes={p.wide ? '(max-width: 1360px) 100vw, 1360px' : '(max-width: 768px) 100vw, 50vw'} />
            <figcaption className="mt-2.5 flex justify-between gap-3 text-xs tracking-[0.04em] text-muted-foreground">
              <b className="font-normal text-foreground">{p.title}</b>
              <span>
                {p.place}
                {p.tirages.length > 0 ? (
                  <>
                    {p.place ? ' · ' : ''}
                    <Link href="/tirages" className="text-accent">
                      {t('printAvailable')}
                    </Link>
                  </>
                ) : null}
              </span>
            </figcaption>
          </figure>
        ))}
      </section>
    </SiteShell>
  )
}
