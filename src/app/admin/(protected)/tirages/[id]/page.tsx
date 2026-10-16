import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { deleteTirage, updateTirage } from '@/actions/tirages'
import { ActionButton, ActionForm } from '@/components/admin/ActionForm'
import { PageHeader } from '@/components/admin/PageHeader'
import { TirageFields } from '@/components/admin/TirageForm'
import { prisma } from '@/lib/db'

export default async function EditTirage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tirage = await prisma.tirage.findUnique({ where: { id } })
  if (!tirage) notFound()
  const [t, tc] = await Promise.all([getTranslations('admin.prints'), getTranslations('admin.common')])
  return (
    <>
      <PageHeader
        eyebrow={t('title')}
        title={t('edit')}
        action={
          <Link href="/admin/tirages" className="btn btn-secondary">
            ← {tc('back')}
          </Link>
        }
      />
      <ActionForm action={updateTirage.bind(null, tirage.id)} extra={<ActionButton action={deleteTirage.bind(null, tirage.id)} label={tc('delete')} confirmLabel={tc('confirmDelete')} className="btn btn-danger btn-sm" redirectTo="/admin/tirages" />}>
        <TirageFields values={tirage} />
      </ActionForm>
    </>
  )
}
