import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { LegalPage } from '@/components/site/LegalPage'

export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'legal' })
  return { title: t('privacy') }
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <LegalPage locale={locale} field="privacy" />
}
