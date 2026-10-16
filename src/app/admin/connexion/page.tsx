import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { login } from '@/actions/auth'
import { ActionForm, Field } from '@/components/admin/ActionForm'
import { BrandMark } from '@/components/site/Brand'
import { getSession } from '@/lib/auth-slot'

export default async function LoginPage() {
  if (await getSession()) redirect('/admin')
  const t = await getTranslations('admin.login')

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-[420px] flex-col justify-center gap-8 px-6">
      <div className="flex items-center gap-3">
        <BrandMark className="h-[26px] w-11" />
        <span className="font-display text-2xl">{t('title')}</span>
      </div>
      <div className="border border-border bg-background p-6">
        <ActionForm action={login} submitLabel={t('submit')}>
          <Field label={t('email')} name="email">
            <input id="login-email" name="email" type="email" className="field" autoComplete="username" />
          </Field>
          <Field label={t('password')} name="password">
            <input id="login-password" name="password" type="password" className="field" autoComplete="current-password" />
          </Field>
        </ActionForm>
      </div>
    </main>
  )
}
