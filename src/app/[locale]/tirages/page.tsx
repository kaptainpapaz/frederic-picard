import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { SiteShell } from '@/components/site/SiteShell'
import { TirageGrid, type TirageCard } from '@/components/site/TiragePanel'
import { getContent } from '@/lib/content'
import { formatPrice, shopTirages } from '@/lib/queries'

export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'shop' })
  return { title: t('title') }
}

export default async function TiragesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('shop')
  const [tirages, shop] = await Promise.all([shopTirages(), getContent('shop')])

  const items: TirageCard[] = tirages.map((x) => ({
    id: x.id,
    title: x.photo.title,
    serie: x.photo.serie?.title ?? '',
    fileKey: x.photo.fileKey,
    format: x.format,
    paper: x.paper,
    edition: t('edition', { n: x.editionNumber, size: x.editionSize }),
    price: formatPrice(x.priceCents),
    status: x.status === 'HIDDEN' ? 'SOLD' : x.status,
    note: x.note,
  }))
  const series = [...new Set(items.map((i) => i.serie).filter(Boolean))]

  return (
    <SiteShell>
      <section className="mx-auto grid max-w-[1360px] items-end gap-6 px-6 pt-14 pb-10 md:grid-cols-[2fr_1fr] md:gap-10">
        <div>
          <div className="eyebrow">{t('eyebrow')}</div>
          <h1 className="font-display mt-2 text-[clamp(44px,6vw,92px)] leading-[0.95]">{t('title')}</h1>
        </div>
        <p className="m-0 max-w-[48ch] text-muted-foreground">{shop.lead}</p>
      </section>
      <section className="mx-auto max-w-[1360px] px-6">
        <TirageGrid items={items} series={series} orderNote={shop.orderNote} />
      </section>
    </SiteShell>
  )
}
