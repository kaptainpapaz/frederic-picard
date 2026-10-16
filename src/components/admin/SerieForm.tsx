import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'
import { Field } from '@/components/admin/ActionForm'
import { Card } from '@/components/admin/PageHeader'
import { variantUrl } from '@/lib/media-urls'

type SerieValues = {
  title: string
  slug: string
  year: number | null
  status: 'DRAFT' | 'PUBLISHED' | 'ONGOING'
  intro: string
  featured: boolean
  coverPhotoId: string | null
}

/** Champs d'une série (création et modification). Rendu côté serveur, erreurs via Field. */
export async function SerieFields({ values, photos, extra }: { values: SerieValues; photos: { id: string; fileKey: string; title: string }[]; extra?: ReactNode }) {
  const t = await getTranslations('admin.series')
  const cover = photos.find((p) => p.id === values.coverPhotoId) ?? photos[0]
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Card>
        <Field label={t('fields.title')} name="title">
          <input id="s-title" name="title" defaultValue={values.title} className="field" />
        </Field>
        <Field label={t('fields.slug')} name="slug" hint={t('fields.slugHint')}>
          <input id="s-slug" name="slug" defaultValue={values.slug} className="field" />
        </Field>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label={t('fields.year')} name="year">
            <input id="s-year" name="year" inputMode="numeric" defaultValue={values.year ?? ''} className="field" />
          </Field>
          <Field label={t('fields.status')} name="status">
            <select id="s-status" name="status" defaultValue={values.status} className="field">
              {(['PUBLISHED', 'DRAFT', 'ONGOING'] as const).map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s}`)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={t('fields.intro')} name="intro">
          <textarea id="s-intro" name="intro" defaultValue={values.intro} className="field min-h-[90px]" />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="featured" defaultChecked={values.featured} className="accent-accent" /> {t('fields.featured')}
        </label>
      </Card>
      <Card title={t('fields.cover')}>
        <div className="frame">{cover ? <img src={variantUrl(cover.fileKey, 1280)} alt="" /> : null}</div>
        {photos.length > 0 ? (
          <Field label={t('fields.cover')} name="coverPhotoId">
            <select id="s-cover" name="coverPhotoId" defaultValue={values.coverPhotoId ?? ''} className="field">
              <option value="">{t('fields.coverFirst')}</option>
              {photos.map((p, i) => (
                <option key={p.id} value={p.id}>
                  {i + 1} · {p.title}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        {extra}
      </Card>
    </div>
  )
}
