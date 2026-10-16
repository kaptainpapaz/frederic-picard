import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ContactForm } from '@/components/site/ContactForm'
import { SiteShell } from '@/components/site/SiteShell'
import { getContent } from '@/lib/content'

export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'contact' })
  return { title: t('title') }
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('contact')
  const [contact, identity] = await Promise.all([getContent('contact'), getContent('identity')])

  return (
    <SiteShell>
      <section className="mx-auto grid max-w-[1360px] gap-12 px-6 pt-14 pb-24 md:grid-cols-2 md:gap-16">
        <div>
          <div className="eyebrow">{t('title')}</div>
          <h1 className="font-display mt-2 mb-5 text-[clamp(40px,5vw,72px)] leading-none">{contact.title}</h1>
          <p className="max-w-[40ch] text-muted-foreground">
            {contact.text} {t('reply', { delay: identity.replyDelay })}
          </p>
          <div className="mt-8 grid gap-4">
            <div className="grid gap-0.5">
              <span className="eyebrow">{t('email')}</span>
              <b className="text-[17px] font-normal select-all">{identity.email}</b>
            </div>
            {identity.phone ? (
              <div className="grid gap-0.5">
                <span className="eyebrow">{t('phone')}</span>
                <b className="text-[17px] font-normal select-all">{identity.phone}</b>
              </div>
            ) : null}
            {identity.city ? (
              <div className="grid gap-0.5">
                <span className="eyebrow">{t('city')}</span>
                <b className="text-[17px] font-normal">{identity.city}</b>
              </div>
            ) : null}
            {identity.instagram ? (
              <div className="grid gap-0.5">
                <span className="eyebrow">Instagram</span>
                <b className="text-[17px] font-normal">{identity.instagram}</b>
              </div>
            ) : null}
          </div>
        </div>
        <ContactForm subjects={contact.subjects} />
      </section>
    </SiteShell>
  )
}
