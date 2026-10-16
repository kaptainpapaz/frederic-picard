import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { Picture } from '@/components/site/Picture'
import { SiteShell } from '@/components/site/SiteShell'
import { coverOf, publishedSeries } from '@/lib/queries'

export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'series' })
  return { title: t('title') }
}

const GRID = ['md:col-span-8', 'md:col-span-4 md:self-end', 'md:col-span-4 md:self-end', 'md:col-span-8']

export default async function SeriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('series')
  const series = await publishedSeries()

  return (
    <SiteShell>
      <section className="mx-auto grid max-w-[1360px] items-end gap-6 px-6 pt-14 pb-10 md:grid-cols-[2fr_1fr] md:gap-10">
        <div>
          <div className="eyebrow">{t('eyebrow')}</div>
          <h1 className="font-display mt-2 text-[clamp(44px,6vw,92px)] leading-[0.95]">{t('title')}</h1>
        </div>
        <p className="m-0 max-w-[48ch] text-muted-foreground">{t('lead')}</p>
      </section>

      {series.length === 0 ? <p className="mx-auto max-w-[1360px] px-6 pb-24 text-muted-foreground">{t('empty')}</p> : null}

      <section className="mx-auto grid max-w-[1360px] gap-x-8 gap-y-14 px-6 pb-24 md:grid-cols-12">
        {series.map((s, i) => {
          const cover = coverOf(s)
          const prints = s.photos.some((p) => p.tirages.length > 0)
          return (
            <Link key={s.id} href={`/series/${s.slug}`} className={`block ${GRID[i % 4]}`}>
              <Picture fileKey={cover?.fileKey} alt={s.title} sizes="(max-width: 768px) 100vw, 66vw" />
              <h2 className="font-display mt-3.5 mb-0.5 text-[30px]">{s.title}</h2>
              <div className="flex flex-wrap gap-3.5 text-[13px] text-muted-foreground">
                <span>{t('meta', { year: s.year ?? '', count: s.photos.length, status: s.status })}</span>
                {prints ? <i className="text-accent not-italic">{t('printsAvailable')}</i> : null}
              </div>
            </Link>
          )
        })}
      </section>
    </SiteShell>
  )
}
