import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Card, PageHeader, StatusPill } from '@/components/admin/PageHeader'
import { prisma } from '@/lib/db'
import { variantUrl } from '@/lib/media-urls'
import { formatPrice } from '@/lib/queries'

export default async function TiragesAdmin() {
  const [t, tc] = await Promise.all([getTranslations('admin.prints'), getTranslations('admin.common')])
  const tirages = await prisma.tirage.findMany({ orderBy: [{ status: 'asc' }, { order: 'asc' }], include: { photo: { include: { serie: { select: { title: true } } } } } })
  const tone = { AVAILABLE: 'ok', RESERVED: 'warn', SOLD: 'bad', HIDDEN: 'muted' } as const

  return (
    <>
      <PageHeader
        eyebrow={tc('edit')}
        title={t('title')}
        lead={t('lead')}
        action={
          <Link href="/admin/tirages/nouveau" className="btn">
            {t('new')}
          </Link>
        }
      />
      <Card>
        {tirages.length === 0 ? <span className="text-sm text-muted-foreground">{t('empty')}</span> : null}
        {tirages.map((x) => (
          <div key={x.id} className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4 first:border-t-0 first:pt-0">
            <Link href={`/admin/tirages/${x.id}`} className="flex min-w-0 items-center gap-3.5">
              <span className="frame w-24 flex-none">
                <img src={variantUrl(x.photo.fileKey, 640)} alt="" />
              </span>
              <span className="min-w-0">
                <b className="block truncate font-medium">{x.photo.title}</b>
                <small className="text-muted-foreground">
                  {x.photo.serie?.title} · {x.format} · {t('edition', { size: x.editionSize, n: x.editionNumber })}
                </small>
              </span>
            </Link>
            <span className="flex flex-wrap items-center gap-3">
              <b className="font-medium">{formatPrice(x.priceCents)}</b>
              <StatusPill tone={tone[x.status]}>{t(`status.${x.status}`)}</StatusPill>
              <Link href={`/admin/tirages/${x.id}`} className="btn btn-secondary btn-sm">
                {tc('edit')}
              </Link>
            </span>
          </div>
        ))}
      </Card>
    </>
  )
}
