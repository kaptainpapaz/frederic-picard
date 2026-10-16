import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { createSerie } from '@/actions/series'
import { ActionForm } from '@/components/admin/ActionForm'
import { PageHeader } from '@/components/admin/PageHeader'
import { SerieFields } from '@/components/admin/SerieForm'

export default async function NewSerie() {
  const [t, tc] = await Promise.all([getTranslations('admin.series'), getTranslations('admin.common')])
  return (
    <>
      <PageHeader
        eyebrow={t('title')}
        title={t('new')}
        lead={t('photos.hint')}
        action={
          <Link href="/admin/series" className="btn btn-secondary">
            ← {tc('back')}
          </Link>
        }
      />
      <ActionForm action={createSerie}>
        <SerieFields values={{ title: '', slug: '', year: new Date().getFullYear(), status: 'PUBLISHED', intro: '', featured: false, coverPhotoId: null }} photos={[]} />
      </ActionForm>
    </>
  )
}
