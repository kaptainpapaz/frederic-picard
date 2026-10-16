import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { deleteSerie, updateSerie } from '@/actions/series'
import { ActionButton, ActionForm } from '@/components/admin/ActionForm'
import { PageHeader } from '@/components/admin/PageHeader'
import { PhotoManager } from '@/components/admin/PhotoManager'
import { SerieFields } from '@/components/admin/SerieForm'
import { prisma } from '@/lib/db'

export default async function EditSerie({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const serie = await prisma.serie.findUnique({ where: { id }, include: { photos: { orderBy: { order: 'asc' } } } })
  if (!serie) notFound()
  const [t, tc] = await Promise.all([getTranslations('admin.series'), getTranslations('admin.common')])

  return (
    <>
      <PageHeader
        eyebrow={t('title')}
        title={t('edit', { title: serie.title })}
        action={
          <span className="flex gap-2">
            {serie.status === 'DRAFT' ? (
              <span className="self-center text-xs tracking-[0.14em] text-accent uppercase">{t('draftNotice')}</span>
            ) : (
              <a href={`/fr/series/${serie.slug}`} target="_blank" rel="noreferrer" className="btn btn-secondary">
                {tc('preview')}
              </a>
            )}
            <Link href="/admin/series" className="btn btn-secondary">
              ← {tc('back')}
            </Link>
          </span>
        }
      />
      <ActionForm action={updateSerie.bind(null, serie.id)} extra={<ActionButton action={deleteSerie.bind(null, serie.id)} label={tc('delete')} confirmLabel={tc('confirmDelete')} className="btn btn-danger btn-sm" redirectTo="/admin/series" />}>
        <SerieFields values={serie} photos={serie.photos.map((p) => ({ id: p.id, fileKey: p.fileKey, title: p.title }))} />
      </ActionForm>
      <div className="mt-8">
        <PhotoManager serieId={serie.id} photos={serie.photos} />
      </div>
    </>
  )
}
