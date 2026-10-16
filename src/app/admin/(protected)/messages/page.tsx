import { getTranslations } from 'next-intl/server'
import { setMessageStatus } from '@/actions/content'
import { ActionButton } from '@/components/admin/ActionForm'
import { Card, PageHeader, StatusPill } from '@/components/admin/PageHeader'
import { prisma } from '@/lib/db'
import { formatPrice } from '@/lib/queries'

export default async function MessagesAdmin() {
  const t = await getTranslations('admin.messages')
  const messages = await prisma.message.findMany({
    where: { status: { not: 'ARCHIVED' } },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: { tirage: { include: { photo: { select: { title: true } } } } },
  })
  const dateFmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <>
      <PageHeader title={t('title')} lead={t('lead')} />
      <Card>
        {messages.length === 0 ? <span className="text-sm text-muted-foreground">{t('empty')}</span> : null}
        {messages.map((m) => (
          <article key={m.id} id={m.id} className="grid gap-2 border-t border-border pt-4 first:border-t-0 first:pt-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex flex-wrap items-center gap-3">
                <b className="font-medium">{m.name}</b>
                <span className="text-sm text-muted-foreground select-all">{m.email}</span>
                <StatusPill tone={m.kind === 'ORDER' ? 'warn' : 'muted'}>{t(`kind.${m.kind}`)}</StatusPill>
                <StatusPill tone={m.status === 'NEW' ? 'warn' : 'ok'}>{t(`status.${m.status}`)}</StatusPill>
              </span>
              <span className="text-xs text-muted-foreground">{dateFmt.format(m.createdAt)}</span>
            </div>
            {m.subject ? <div className="text-sm">{m.subject}</div> : null}
            {m.tirage ? (
              <div className="text-sm text-muted-foreground">
                {t('tirage')} : {m.tirage.photo.title} · {m.tirage.format} · n° {m.tirage.editionNumber}/{m.tirage.editionSize} · {formatPrice(m.tirage.priceCents)}
              </div>
            ) : null}
            <p className="m-0 text-sm whitespace-pre-line text-muted-foreground">{m.body}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || 'votre message'}`)}`} className="btn btn-secondary btn-sm">
                {t('reply')}
              </a>
              {m.status === 'NEW' ? <ActionButton action={setMessageStatus.bind(null, m.id, 'ANSWERED')} label={t('markAnswered')} /> : null}
              <ActionButton action={setMessageStatus.bind(null, m.id, 'ARCHIVED')} label={t('archive')} />
            </div>
          </article>
        ))}
      </Card>
    </>
  )
}
