import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { moveSerie } from '@/actions/series'
import { ActionButton } from '@/components/admin/ActionForm'
import { Card, PageHeader, StatusPill } from '@/components/admin/PageHeader'
import { prisma } from '@/lib/db'
import { variantUrl } from '@/lib/media-urls'
import { coverOf } from '@/lib/queries'

export default async function SeriesAdmin() {
  const [t, tc] = await Promise.all([getTranslations('admin.series'), getTranslations('admin.common')])
  const series = await prisma.serie.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'desc' }], include: { photos: { orderBy: { order: 'asc' }, select: { id: true, fileKey: true } } } })

  return (
    <>
      <PageHeader
        eyebrow={tc('edit')}
        title={t('title')}
        lead={t('lead')}
        action={
          <Link href="/admin/series/nouvelle" className="btn">
            {t('new')}
          </Link>
        }
      />
      <Card>
        {series.length === 0 ? <span className="text-sm text-muted-foreground">{t('empty')}</span> : null}
        {series.map((s, i) => {
          const cover = coverOf(s)
          return (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4 first:border-t-0 first:pt-0">
              <Link href={`/admin/series/${s.id}`} className="flex min-w-0 items-center gap-3.5">
                <span className="frame w-24 flex-none">{cover ? <img src={variantUrl(cover.fileKey, 640)} alt="" /> : null}</span>
                <span className="min-w-0">
                  <b className="block truncate font-medium">{s.title}</b>
                  <small className="text-muted-foreground">{t('meta', { year: s.year ?? '', count: s.photos.length })}</small>
                </span>
              </Link>
              <span className="flex flex-wrap items-center gap-2">
                {s.featured ? <StatusPill tone="warn">★</StatusPill> : null}
                <StatusPill tone={s.status === 'DRAFT' ? 'warn' : 'ok'}>{t(`status.${s.status}`)}</StatusPill>
                {i > 0 ? <ActionButton action={moveSerie.bind(null, s.id, 'up')} label="↑" /> : null}
                {i < series.length - 1 ? <ActionButton action={moveSerie.bind(null, s.id, 'down')} label="↓" /> : null}
                <Link href={`/admin/series/${s.id}`} className="btn btn-secondary btn-sm">
                  {tc('edit')}
                </Link>
              </span>
            </div>
          )
        })}
      </Card>
    </>
  )
}
