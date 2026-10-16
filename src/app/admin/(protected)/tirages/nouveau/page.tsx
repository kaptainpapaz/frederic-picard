import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { createTirage } from '@/actions/tirages'
import { ActionForm } from '@/components/admin/ActionForm'
import { PageHeader } from '@/components/admin/PageHeader'
import { TirageFields } from '@/components/admin/TirageForm'

export default async function NewTirage() {
  const [t, tc] = await Promise.all([getTranslations('admin.prints'), getTranslations('admin.common')])
  return (
    <>
      <PageHeader
        eyebrow={t('title')}
        title={t('new')}
        action={
          <Link href="/admin/tirages" className="btn btn-secondary">
            ← {tc('back')}
          </Link>
        }
      />
      <ActionForm action={createTirage}>
        <TirageFields values={{ photoId: '', format: '', paper: 'Tirage pigmentaire, papier baryté 315 g', editionSize: 12, editionNumber: 1, priceCents: 0, status: 'AVAILABLE', note: '' }} />
      </ActionForm>
    </>
  )
}
