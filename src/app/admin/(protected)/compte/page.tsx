import { getTranslations } from 'next-intl/server'
import { changePassword, updateAccount } from '@/actions/auth'
import { ActionForm, Field } from '@/components/admin/ActionForm'
import { Card, PageHeader } from '@/components/admin/PageHeader'
import { getSession } from '@/lib/auth-slot'

export default async function AccountAdmin() {
  const [t, session] = await Promise.all([getTranslations('admin.account'), getSession()])
  return (
    <>
      <PageHeader title={t('title')} lead={t('lead')} />
      <div className="grid max-w-[560px] gap-8">
        <ActionForm action={updateAccount}>
          <Card>
            <Field label={t('email')} name="email">
              <input id="a-email" name="email" type="email" defaultValue={session?.user.email} className="field" autoComplete="username" />
            </Field>
            <Field label={t('name')} name="name">
              <input id="a-name" name="name" defaultValue={session?.user.name ?? ''} className="field" />
            </Field>
          </Card>
        </ActionForm>
        <ActionForm action={changePassword}>
          <Card>
            <Field label={t('current')} name="current">
              <input id="a-current" name="current" type="password" className="field" autoComplete="current-password" />
            </Field>
            <Field label={t('next')} name="next">
              <input id="a-next" name="next" type="password" className="field" autoComplete="new-password" />
            </Field>
            <Field label={t('confirm')} name="confirm">
              <input id="a-confirm" name="confirm" type="password" className="field" autoComplete="new-password" />
            </Field>
          </Card>
        </ActionForm>
      </div>
    </>
  )
}
