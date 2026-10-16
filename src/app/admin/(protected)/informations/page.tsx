import { getTranslations } from 'next-intl/server'
import { saveContent } from '@/actions/content'
import { ActionForm, Field } from '@/components/admin/ActionForm'
import { Card, PageHeader } from '@/components/admin/PageHeader'
import { getContent, type Identity } from '@/lib/content'

const GROUPS: { title: 'identity' | 'contact' | 'shop'; keys: (keyof Identity)[] }[] = [
  { title: 'identity', keys: ['displayName', 'tagline', 'city'] },
  { title: 'contact', keys: ['email', 'notifyEmail', 'phone', 'instagram', 'replyDelay'] },
  { title: 'shop', keys: ['shippingDelay', 'shippingZones', 'shippingFees'] },
]

export default async function InfosAdmin() {
  const t = await getTranslations('admin.infos')
  const identity = await getContent('identity')
  return (
    <>
      <PageHeader title={t('title')} lead={t('lead')} />
      <ActionForm action={saveContent.bind(null, 'identity')}>
        <div className="grid gap-5 md:grid-cols-2">
          {GROUPS.map((g) => (
            <Card key={g.title} title={t(g.title)}>
              {g.keys.map((k) => (
                <Field key={k} label={t(`fields.${k}`)} name={k}>
                  <input id={`i-${k}`} name={k} defaultValue={identity[k]} className="field" />
                </Field>
              ))}
            </Card>
          ))}
        </div>
      </ActionForm>
    </>
  )
}
