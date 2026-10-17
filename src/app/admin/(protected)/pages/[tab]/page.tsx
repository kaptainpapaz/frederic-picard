import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { saveContent } from '@/actions/content'
import { ActionForm, Field } from '@/components/admin/ActionForm'
import { Card, PageHeader } from '@/components/admin/PageHeader'
import { HeroPicker } from '@/components/admin/HeroPicker'
import { PhotoManager } from '@/components/admin/PhotoManager'
import { getContent } from '@/lib/content'
import { prisma } from '@/lib/db'
import { variantUrl } from '@/lib/media-urls'

const TABS = { accueil: 'home', contact: 'contact', boutique: 'shop', mentions: 'legal' } as const
type Tab = keyof typeof TABS

export default async function PagesAdmin({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params
  if (!(tab in TABS)) notFound()
  const key = TABS[tab as Tab]
  const t = await getTranslations('admin.pages')

  return (
    <>
      <PageHeader title={t('title')} lead={t('lead')} />
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
        {(Object.keys(TABS) as Tab[]).map((k) => (
          <Link key={k} href={`/admin/pages/${k}`} className={`border-b-2 px-3.5 py-2.5 text-sm whitespace-nowrap ${k === tab ? 'border-accent text-foreground' : 'border-transparent text-muted-foreground'}`}>
            {t(`tabs.${TABS[k]}`)}
          </Link>
        ))}
      </div>
      {key === 'home' ? <HomeTab /> : null}
      {key === 'contact' ? <ContactTab /> : null}
      {key === 'shop' ? <ShopTab /> : null}
      {key === 'legal' ? <LegalTab /> : null}
    </>
  )
}

async function HomeTab() {
  const t = await getTranslations('admin.pages.home')
  const [home, photos, standalone] = await Promise.all([
    getContent('home'),
    prisma.photo.findMany({ orderBy: [{ serie: { order: 'asc' } }, { order: 'asc' }], include: { serie: { select: { title: true } } } }),
    prisma.photo.findMany({ where: { serieId: null }, orderBy: { order: 'asc' } }),
  ])
  const atelier = photos.find((p) => p.id === home.atelierPhotoId)
  const values = [0, 1, 2].map((i) => home.values[i] ?? { mark: '', title: '', text: '' })

  return (
    <>
      <ActionForm action={saveContent.bind(null, 'home')}>
        <div className="grid gap-5 md:grid-cols-2">
          <Card title={t('hero')}>
            <HeroPicker
              photos={photos.map((p) => ({ id: p.id, fileKey: p.fileKey, label: `${p.serie ? `${p.serie.title} · ` : ''}${p.title || p.id}` }))}
              photoId={home.heroPhotoId}
              focusX={home.heroFocusX}
              focusY={home.heroFocusY}
              heroText={home.heroText}
              none={t('noPhoto')}
            />
            <Field label={t('heroText')} name="heroText">
              <textarea name="heroText" defaultValue={home.heroText} className="field min-h-[80px]" />
            </Field>
            <Field label={t('heroCta')} name="heroCta">
              <input name="heroCta" defaultValue={home.heroCta} className="field" />
            </Field>
          </Card>
          <Card title={t('intro')}>
            <Field label={t('introStrong')} name="introStrong">
              <textarea name="introStrong" defaultValue={home.introStrong} className="field min-h-[100px]" />
            </Field>
            <Field label={t('introBody')} name="introBody">
              <textarea name="introBody" defaultValue={home.introBody} className="field min-h-[140px]" />
            </Field>
            <div className="eyebrow mt-2">{t('atelier')}</div>
            <div className="frame">{atelier ? <img src={variantUrl(atelier.fileKey, 1280)} alt="" /> : null}</div>
            <Field label={t('choosePhoto')} name="atelierPhotoId">
              <PhotoSelect name="atelierPhotoId" value={home.atelierPhotoId} photos={photos} none={t('noPhoto')} />
            </Field>
            <Field label={t('atelierCaption')} name="atelierCaption">
              <input name="atelierCaption" defaultValue={home.atelierCaption} className="field" />
            </Field>
          </Card>
        </div>
        <Card title={t('prints')}>
          <Field label={t('printsTitle')} name="printsTitle">
            <input name="printsTitle" defaultValue={home.printsTitle} className="field" />
          </Field>
          <Field label={t('printsText')} name="printsText">
            <textarea name="printsText" defaultValue={home.printsText} className="field min-h-[70px]" />
          </Field>
        </Card>
        <Card title={t('values')}>
          <div className="grid gap-5 md:grid-cols-3">
            {values.map((v, i) => (
              <div key={i} className="grid gap-4">
                <Field label={t('mark')} name={`values.${i}.mark`}>
                  <input name={`values.${i}.mark`} defaultValue={v.mark} className="field" />
                </Field>
                <Field label={t('valueTitle')} name={`values.${i}.title`}>
                  <input name={`values.${i}.title`} defaultValue={v.title} className="field" />
                </Field>
                <Field label={t('valueText')} name={`values.${i}.text`}>
                  <textarea name={`values.${i}.text`} defaultValue={v.text} className="field min-h-[90px]" />
                </Field>
              </div>
            ))}
          </div>
        </Card>
        <Card title={t('invite')}>
          <Field label={t('inviteTitle')} name="inviteTitle">
            <input name="inviteTitle" defaultValue={home.inviteTitle} className="field" />
          </Field>
          <Field label={t('inviteText')} name="inviteText">
            <textarea name="inviteText" defaultValue={home.inviteText} className="field min-h-[70px]" />
          </Field>
        </Card>
      </ActionForm>
      <div className="mt-8">
        <div className="eyebrow mb-3">{t('uploadNew')}</div>
        <PhotoManager serieId={null} photos={standalone} />
      </div>
    </>
  )
}

function PhotoSelect({ name, value, photos, none }: { name: string; value: string | null; photos: { id: string; title: string; serie: { title: string } | null }[]; none: string }) {
  return (
    <select name={name} defaultValue={value ?? ''} className="field">
      <option value="">{none}</option>
      {photos.map((p) => (
        <option key={p.id} value={p.id}>
          {p.serie ? `${p.serie.title} · ` : ''}
          {p.title || p.id}
        </option>
      ))}
    </select>
  )
}

async function ContactTab() {
  const t = await getTranslations('admin.pages.contact')
  const contact = await getContent('contact')
  return (
    <ActionForm action={saveContent.bind(null, 'contact')}>
      <Card>
        <Field label={t('title')} name="title">
          <input name="title" defaultValue={contact.title} className="field" />
        </Field>
        <Field label={t('text')} name="text">
          <textarea name="text" defaultValue={contact.text} className="field min-h-[90px]" />
        </Field>
        <Field label={t('subjects')} name="subjects">
          <textarea name="subjects" defaultValue={contact.subjects.join('\n')} className="field min-h-[110px]" />
        </Field>
      </Card>
    </ActionForm>
  )
}

async function ShopTab() {
  const t = await getTranslations('admin.pages.shop')
  const shop = await getContent('shop')
  return (
    <ActionForm action={saveContent.bind(null, 'shop')}>
      <Card>
        <Field label={t('lead')} name="lead">
          <textarea name="lead" defaultValue={shop.lead} className="field min-h-[90px]" />
        </Field>
        <Field label={t('orderNote')} name="orderNote">
          <textarea name="orderNote" defaultValue={shop.orderNote} className="field min-h-[70px]" />
        </Field>
      </Card>
    </ActionForm>
  )
}

async function LegalTab() {
  const t = await getTranslations('admin.pages.legal')
  const legal = await getContent('legal')
  return (
    <ActionForm action={saveContent.bind(null, 'legal')}>
      <Card>
        <Field label={t('mentions')} name="mentions">
          <textarea name="mentions" defaultValue={legal.mentions} className="field min-h-[160px]" />
        </Field>
        <Field label={t('cgv')} name="cgv">
          <textarea name="cgv" defaultValue={legal.cgv} className="field min-h-[160px]" />
        </Field>
        <Field label={t('privacy')} name="privacy">
          <textarea name="privacy" defaultValue={legal.privacy} className="field min-h-[160px]" />
        </Field>
      </Card>
    </ActionForm>
  )
}
