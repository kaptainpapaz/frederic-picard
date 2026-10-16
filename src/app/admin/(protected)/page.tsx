import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Card, StatusPill } from '@/components/admin/PageHeader'
import { getSession } from '@/lib/auth-slot'
import { prisma } from '@/lib/db'
import { variantUrl } from '@/lib/media-urls'

export default async function Dashboard() {
  const [t, ts, tm, session] = await Promise.all([getTranslations('admin.dashboard'), getTranslations('admin.series'), getTranslations('admin.messages'), getSession()])
  const [seriesCount, photos, prints, newMessages, latestSeries, latestMessages] = await Promise.all([
    prisma.serie.count({ where: { status: { in: ['PUBLISHED', 'ONGOING'] } } }),
    prisma.photo.count({ where: { serieId: { not: null } } }),
    prisma.tirage.count({ where: { status: 'AVAILABLE' } }),
    prisma.message.count({ where: { status: 'NEW' } }),
    prisma.serie.findMany({ orderBy: { updatedAt: 'desc' }, take: 4, include: { photos: { orderBy: { order: 'asc' }, take: 1 }, _count: { select: { photos: true } } } }),
    prisma.message.findMany({ orderBy: { createdAt: 'desc' }, take: 4 }),
  ])

  const actions = [
    { href: '/admin/series/nouvelle', title: t('newSerie'), hint: t('newSerieHint') },
    { href: '/admin/tirages/nouveau', title: t('newPrint'), hint: t('newPrintHint') },
    { href: '/admin/pages/accueil', title: t('heroPhoto'), hint: t('heroPhotoHint') },
    { href: '/admin/pages/accueil', title: t('editPages'), hint: t('editPagesHint') },
    { href: '/admin/informations', title: t('infos'), hint: t('infosHint') },
    { href: '/admin/messages', title: t('readMessages'), hint: t('readMessagesHint', { count: newMessages }) },
  ]

  return (
    <>
      <div className="mb-7">
        <div className="eyebrow">
          {t('hello')} {session?.user.name ?? ''}
        </div>
        <h1 className="font-display mt-1 text-[32px] leading-none md:text-[38px]">{t('title')}</h1>
      </div>
      <div className="mb-7 grid gap-4 md:grid-cols-3">
        <Card>
          <b className="font-display text-4xl font-normal leading-none">{seriesCount}</b>
          <span className="text-xs text-muted-foreground">{t('seriesCount', { count: seriesCount, photos })}</span>
        </Card>
        <Card>
          <b className="font-display text-4xl font-normal leading-none">{prints}</b>
          <span className="text-xs text-muted-foreground">{t('printsCount', { count: prints })}</span>
        </Card>
        <Card>
          <b className="font-display text-4xl font-normal leading-none">{newMessages}</b>
          <span className="text-xs text-muted-foreground">{t('newMessages', { count: newMessages })}</span>
        </Card>
      </div>
      <div className="eyebrow mb-3">{t('whatToDo')}</div>
      <div className="mb-8 grid gap-3.5 md:grid-cols-3">
        {actions.map((a, i) => (
          <Link key={i} href={a.href} className="grid gap-1.5 border border-border bg-background p-4 hover:border-foreground">
            <b className="text-[15px] font-medium">{a.title}</b>
            <span className="text-xs text-muted-foreground">{a.hint}</span>
          </Link>
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Card title={t('latestSeries')}>
          {latestSeries.length === 0 ? <span className="text-sm text-muted-foreground">{ts('empty')}</span> : null}
          {latestSeries.map((s) => (
            <Link key={s.id} href={`/admin/series/${s.id}`} className="flex items-center justify-between gap-4 border-t border-border pt-4 first:border-t-0 first:pt-0">
              <span className="flex min-w-0 items-center gap-3.5">
                <span className="frame w-24 flex-none">{s.photos[0] ? <img src={variantUrl(s.photos[0].fileKey, 640)} alt="" /> : null}</span>
                <span className="min-w-0">
                  <b className="block truncate font-medium">{s.title}</b>
                  <small className="text-muted-foreground">{ts('meta', { year: s.year ?? '', count: s._count.photos })}</small>
                </span>
              </span>
              <StatusPill tone={s.status === 'DRAFT' ? 'warn' : 'ok'}>{ts(`status.${s.status}`)}</StatusPill>
            </Link>
          ))}
        </Card>
        <Card title={t('latestMessages')}>
          {latestMessages.length === 0 ? <span className="text-sm text-muted-foreground">{tm('empty')}</span> : null}
          {latestMessages.map((m) => (
            <Link key={m.id} href={`/admin/messages#${m.id}`} className="flex items-center justify-between gap-4 border-t border-border pt-4 first:border-t-0 first:pt-0">
              <span className="min-w-0">
                <b className="block truncate font-medium">{m.name}</b>
                <small className="block truncate text-muted-foreground">
                  {tm(`kind.${m.kind}`)} · {m.subject || m.body.slice(0, 80)}
                </small>
              </span>
              <StatusPill tone={m.status === 'NEW' ? 'warn' : 'muted'}>{tm(`status.${m.status}`)}</StatusPill>
            </Link>
          ))}
        </Card>
      </div>
    </>
  )
}
